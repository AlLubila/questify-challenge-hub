import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

type UserRole = "admin" | "moderator" | "user";

export const ChallengeModeration = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const { data: challenges, isLoading } = useQuery({
    queryKey: ["allChallenges"],
    queryFn: async () => {
      const { data: challengesData, error: challengesError } = await supabase
        .from("challenges")
        .select("*")
        .order("created_at", { ascending: false });

      if (challengesError) throw challengesError;

      const creatorIds = challengesData
        .map((c) => c.created_by)
        .filter((id) => id !== null);

      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, username, display_name")
        .in("id", creatorIds);

      if (profilesError) throw profilesError;

      return challengesData.map((challenge) => ({
        ...challenge,
        profiles: profiles?.find((p) => p.id === challenge.created_by) || null,
      }));
    },
  });

  const logActivity = async (targetId: string, reason?: string) => {
    if (!user) return;
    
    await supabase.from("admin_activity_logs").insert({
      admin_id: user.id,
      action_type: "delete_challenge",
      target_type: "challenge",
      target_id: targetId,
      reason,
    });
  };

  const deleteChallenge = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase.from("challenges").delete().in("id", ids);
      if (error) throw error;

      // Log activity for each challenge
      for (const id of ids) {
        await logActivity(id, "Bulk deletion");
      }
    },
    onSuccess: (_, ids) => {
      queryClient.invalidateQueries({ queryKey: ["allChallenges"] });
      setSelectedIds([]);
      toast.success(`${ids.length} challenge(s) deleted successfully`);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete challenge");
    },
  });

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    if (selectedIds.length === (challenges?.length || 0)) {
      setSelectedIds([]);
    } else {
      setSelectedIds(challenges?.map((c) => c.id) || []);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">Challenge Moderation</h1>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Challenge Moderation</h1>
        {selectedIds.length > 0 && (
          <Button
            variant="destructive"
            onClick={() => deleteChallenge.mutate(selectedIds)}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Selected ({selectedIds.length})
          </Button>
        )}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>All Challenges</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedIds.length === challenges?.length && challenges.length > 0}
                    onCheckedChange={toggleAll}
                  />
                </TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Creator</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Difficulty</TableHead>
                <TableHead>Participants</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {challenges?.map((challenge) => (
                <TableRow key={challenge.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.includes(challenge.id)}
                      onCheckedChange={() => toggleSelection(challenge.id)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{challenge.title}</TableCell>
                  <TableCell>
                    {challenge.is_ai_generated ? (
                      <Badge variant="secondary">AI Generated</Badge>
                    ) : (
                      challenge.profiles?.display_name ||
                      challenge.profiles?.username ||
                      "Unknown"
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{challenge.challenge_type}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        challenge.difficulty === "hard"
                          ? "destructive"
                          : challenge.difficulty === "medium"
                          ? "default"
                          : "secondary"
                      }
                    >
                      {challenge.difficulty}
                    </Badge>
                  </TableCell>
                  <TableCell>{challenge.participants_count || 0}</TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => deleteChallenge.mutate([challenge.id])}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};