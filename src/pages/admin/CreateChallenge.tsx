import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { Upload, Loader2, Eye } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { ChallengeCard } from "@/components/ChallengeCard";
import challenge1 from "@/assets/challenge-1.jpg";

export const CreateChallenge = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [prize, setPrize] = useState("");
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [points, setPoints] = useState("");
  const [challengeType, setChallengeType] = useState<"daily" | "weekly">("daily");
  const [duration, setDuration] = useState("1");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const [publishStatus, setPublishStatus] = useState<"published" | "scheduled">("published");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image must be less than 5MB");
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const createChallenge = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Must be logged in");
      if (!title || !description || !prize || !points) {
        throw new Error("Please fill in all required fields");
      }

      let imageUrl = null;

      // Upload image if provided
      if (imageFile) {
        const fileExt = imageFile.name.split(".").pop();
        const filePath = `challenges/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from("submissions")
          .upload(filePath, imageFile);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("submissions")
          .getPublicUrl(filePath);

        imageUrl = urlData.publicUrl;
      }

      // Calculate end date and dates for scheduling
      const now = new Date();
      let startDate = now;
      let scheduledPublishAt = null;
      
      if (publishStatus === "scheduled") {
        if (!scheduledDate || !scheduledTime) {
          throw new Error("Please set a schedule date and time");
        }
        scheduledPublishAt = new Date(`${scheduledDate}T${scheduledTime}`);
        if (scheduledPublishAt <= now) {
          throw new Error("Scheduled time must be in the future");
        }
        startDate = scheduledPublishAt;
      }

      const endDate = new Date(startDate);
      const durationDays = challengeType === "daily" ? parseInt(duration) : parseInt(duration) * 7;
      endDate.setDate(endDate.getDate() + durationDays);

      const { error } = await supabase.from("challenges").insert({
        title,
        description,
        prize,
        difficulty,
        points: parseInt(points),
        challenge_type: challengeType,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        image_url: imageUrl,
        created_by: user.id,
        is_ai_generated: false,
        participants_count: 0,
        publish_status: publishStatus,
        scheduled_publish_at: scheduledPublishAt?.toISOString(),
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["challenges"] });
      queryClient.invalidateQueries({ queryKey: ["allChallenges"] });
      const message = publishStatus === "scheduled" 
        ? "Challenge scheduled successfully!" 
        : t("admin.challengeCreated");
      toast.success(message);
      
      // Reset form
      setTitle("");
      setDescription("");
      setPrize("");
      setDifficulty("medium");
      setPoints("");
      setChallengeType("daily");
      setDuration("1");
      setImageFile(null);
      setImagePreview("");
      setPublishStatus("published");
      setScheduledDate("");
      setScheduledTime("");
    },
    onError: (error: Error) => {
      toast.error(error.message || t("admin.challengeCreateFailed"));
    },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">{t("admin.createChallenge")}</h1>
      
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Form Section */}
        <Card>
          <CardHeader>
            <CardTitle>{t("admin.challengeDetails")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">{t("admin.challengeTitle")} *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("admin.challengeTitlePlaceholder")}
              maxLength={100}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">{t("admin.challengeDescription")} *</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("admin.challengeDescriptionPlaceholder")}
              rows={4}
              maxLength={500}
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="prize">{t("admin.prize")} *</Label>
              <Input
                id="prize"
                value={prize}
                onChange={(e) => setPrize(e.target.value)}
                placeholder="$100 Cash"
                maxLength={50}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="points">{t("admin.points")} *</Label>
              <Input
                id="points"
                type="number"
                value={points}
                onChange={(e) => setPoints(e.target.value)}
                placeholder="500"
                min="0"
                max="10000"
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="difficulty">{t("admin.difficulty")}</Label>
              <Select value={difficulty} onValueChange={(value: any) => setDifficulty(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">{t("challenges.easy")}</SelectItem>
                  <SelectItem value="medium">{t("challenges.medium")}</SelectItem>
                  <SelectItem value="hard">{t("challenges.hard")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">{t("admin.challengeType")}</Label>
              <Select value={challengeType} onValueChange={(value: any) => setChallengeType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">{t("admin.daily")}</SelectItem>
                  <SelectItem value="weekly">{t("admin.weekly")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="duration">{t("admin.duration")}</Label>
            <Input
              id="duration"
              type="number"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder={challengeType === "daily" ? "1" : "1"}
              min="1"
              max={challengeType === "daily" ? "30" : "12"}
            />
            <p className="text-sm text-muted-foreground">
              {challengeType === "daily" 
                ? t("admin.durationDaysHint")
                : t("admin.durationWeeksHint")}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="publishStatus">Publish Status</Label>
            <Select value={publishStatus} onValueChange={(value: any) => setPublishStatus(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="published">Publish Now</SelectItem>
                <SelectItem value="scheduled">Schedule for Later</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {publishStatus === "scheduled" && (
            <div className="grid md:grid-cols-2 gap-4 p-4 border border-border rounded-lg bg-muted/30">
              <div className="space-y-2">
                <Label htmlFor="scheduledDate">Schedule Date *</Label>
                <Input
                  id="scheduledDate"
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="scheduledTime">Schedule Time *</Label>
                <Input
                  id="scheduledTime"
                  type="time"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                />
              </div>
              <p className="text-sm text-muted-foreground col-span-2">
                Challenge will be automatically published at the scheduled time
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="image">{t("admin.challengeImage")}</Label>
            <Input
              id="image"
              type="file"
              accept="image/*"
              onChange={handleImageChange}
            />
            {imagePreview && (
              <img
                src={imagePreview}
                alt="Preview"
                className="mt-2 w-full h-48 object-cover rounded-lg"
              />
            )}
          </div>

          <Button
            onClick={() => createChallenge.mutate()}
            disabled={createChallenge.isPending}
            className="w-full"
            size="lg"
          >
            {createChallenge.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("admin.creating")}
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                {t("admin.createChallengeButton")}
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Preview Section */}
      <Card className="lg:sticky lg:top-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5" />
            Live Preview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ChallengeCard
            id="preview"
            title={title || "Challenge Title"}
            description={description || "Challenge description will appear here..."}
            image={imagePreview || challenge1}
            prize={prize || "Reward"}
            participants={0}
            timeLeft={challengeType === "daily" ? `${duration || 1} day${duration !== "1" ? "s" : ""} left` : `${duration || 1} week${duration !== "1" ? "s" : ""} left`}
            points={parseInt(points) || 0}
            difficulty={difficulty}
          />
          <p className="text-sm text-muted-foreground text-center mt-4">
            This is how your challenge will appear to users
          </p>
        </CardContent>
      </Card>
    </div>
  </div>
  );
};
