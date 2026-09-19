import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, Flag, Loader2, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useGenerateChallenge } from "@/hooks/useGenerateChallenge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export const ChallengeAutomation = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const generate = useGenerateChallenge();
  const [enabled, setEnabled] = useState(true);
  const [weekday, setWeekday] = useState("1");
  const [hour, setHour] = useState("16");
  const [creativeBrief, setCreativeBrief] = useState("");

  const settings = useQuery({
    queryKey: ["challenge-automation-settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("challenge_automation_settings").select("*").eq("id", true).single();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (!settings.data) return;
    setEnabled(settings.data.enabled);
    setWeekday(String(settings.data.weekday));
    setHour(String(settings.data.hour_utc));
    setCreativeBrief(settings.data.creative_brief);
  }, [settings.data]);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("challenge_automation_settings").update({ enabled, weekday: Number(weekday), hour_utc: Number(hour), creative_brief: creativeBrief, updated_by: user?.id ?? null, updated_at: new Date().toISOString() }).eq("id", true);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["challenge-automation-settings"] });
      toast.success("Weekly challenge automation updated");
    },
    onError: () => toast.error("Could not update automation settings"),
  });

  return (
    <div className="space-y-6">
      <div>
        <p className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-primary">Challenge engine</p>
        <h1 className="mt-2 text-3xl font-black">Weekly challenge automation</h1>
        <p className="mt-2 text-muted-foreground">Control the weekly AI editor, its publishing time, and the creative standard it follows.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card className="border-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><CalendarClock className="h-5 w-5 text-primary" /> Schedule</CardTitle>
            <CardDescription>The scheduler checks hourly and creates at most one AI weekly challenge per week.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between rounded-xl border-2 border-border p-4">
              <div><Label htmlFor="automation-enabled">Automatic publishing</Label><p className="text-sm text-muted-foreground">Generate and publish a fresh mission every week.</p></div>
              <Switch id="automation-enabled" checked={enabled} onCheckedChange={setEnabled} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2"><Label>Weekday</Label><Select value={weekday} onValueChange={setWeekday}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{weekdays.map((day, index) => <SelectItem key={day} value={String(index)}>{day}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label>Hour (UTC)</Label><Select value={hour} onValueChange={setHour}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Array.from({ length: 24 }, (_, value) => <SelectItem key={value} value={String(value)}>{String(value).padStart(2, "0")}:00 UTC</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div className="space-y-2"><Label htmlFor="creative-brief">Standing creative brief</Label><Textarea id="creative-brief" rows={5} value={creativeBrief} onChange={(event) => setCreativeBrief(event.target.value)} /></div>
            <Button onClick={() => save.mutate()} disabled={save.isPending || settings.isLoading}><Save className="mr-2 h-4 w-4" />Save settings</Button>
          </CardContent>
        </Card>

        <Card className="h-fit border-2 border-primary bg-primary text-primary-foreground shadow-card">
          <CardHeader><CardTitle className="flex items-center gap-2"><Flag className="h-5 w-5" /> Generate now</CardTitle><CardDescription className="text-primary-foreground/70">Ask the editor for one publish-ready weekly mission and matching artwork.</CardDescription></CardHeader>
          <CardContent><Button variant="secondary" className="w-full border-2 border-background" onClick={() => generate.mutate({ type: "weekly", count: 1 })} disabled={generate.isPending}>{generate.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Flag className="mr-2 h-4 w-4" />}Create weekly mission</Button></CardContent>
        </Card>
      </div>
    </div>
  );
};
