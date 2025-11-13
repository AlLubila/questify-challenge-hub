import { useParams, Navigate, useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Trophy, Clock, Users, Upload, Sparkles, ArrowLeft } from "lucide-react";
import { calculateTimeLeft } from "@/hooks/useChallenges";
import { useState } from "react";
import challenge1 from "@/assets/challenge-1.jpg";

const ChallengeDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [contentFile, setContentFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [preview, setPreview] = useState<string>("");

  const { data: challenge, isLoading } = useQuery({
    queryKey: ["challenge", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("challenges")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: existingSubmission } = useQuery({
    queryKey: ["submission", id, user?.id],
    queryFn: async () => {
      if (!user || !id) return null;
      const { data, error } = await supabase
        .from("submissions")
        .select("*")
        .eq("challenge_id", id)
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!id,
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!user || !id || !contentFile) {
        throw new Error("Missing required data");
      }

      // Upload content to storage
      const fileExt = contentFile.name.split(".").pop();
      const filePath = `${user.id}/${id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, contentFile);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      // Create submission
      const { error: submitError } = await supabase
        .from("submissions")
        .insert({
          user_id: user.id,
          challenge_id: id,
          content_url: urlData.publicUrl,
          caption: caption.trim() || null,
          status: "approved", // Auto-approve for now
        });

      if (submitError) throw submitError;

      // Award points
      if (challenge) {
        const { error: pointsError } = await supabase.rpc("increment_points", {
          user_id: user.id,
          points_to_add: challenge.points,
        });

        if (pointsError) console.error("Points error:", pointsError);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["submission"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success(`Submission added! You earned ${challenge?.points} points!`);
      setContentFile(null);
      setCaption("");
      setPreview("");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to submit entry");
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 20 * 1024 * 1024) {
        toast.error("File must be less than 20MB");
        return;
      }
      setContentFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-20 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (!challenge) {
    return <Navigate to="/" replace />;
  }

  const difficultyColors = {
    easy: "bg-success text-success-foreground",
    medium: "bg-accent text-accent-foreground",
    hard: "bg-secondary text-secondary-foreground",
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="container py-8 space-y-8">
        <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Challenge Info */}
          <div className="space-y-6">
            <Card className="overflow-hidden">
              <img
                src={challenge.image_url || challenge1}
                alt={challenge.title}
                className="w-full h-64 object-cover"
              />
              <div className="p-6 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <h1 className="text-3xl font-bold">{challenge.title}</h1>
                  <Badge className={difficultyColors[challenge.difficulty as keyof typeof difficultyColors]}>
                    {challenge.difficulty}
                  </Badge>
                </div>

                <p className="text-muted-foreground text-lg">{challenge.description}</p>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-accent" />
                    <div>
                      <p className="text-sm text-muted-foreground">Prize</p>
                      <p className="font-bold">{challenge.prize}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-primary" />
                    <div>
                      <p className="text-sm text-muted-foreground">Points</p>
                      <p className="font-bold">{challenge.points} pts</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-secondary" />
                    <div>
                      <p className="text-sm text-muted-foreground">Time Left</p>
                      <p className="font-bold">{calculateTimeLeft(challenge.end_date)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-primary" />
                    <div>
                      <p className="text-sm text-muted-foreground">Participants</p>
                      <p className="font-bold">{challenge.participants_count}</p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Submission Form */}
          <div>
            {user ? (
              existingSubmission ? (
                <Card className="p-6">
                  <h2 className="text-2xl font-bold mb-4">Your Submission</h2>
                  <div className="space-y-4">
                    <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                      <img
                        src={existingSubmission.content_url}
                        alt="Your submission"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    {existingSubmission.caption && (
                      <p className="text-muted-foreground">{existingSubmission.caption}</p>
                    )}
                    <Badge>{existingSubmission.status}</Badge>
                    <p className="text-sm text-muted-foreground">
                      Submitted {new Date(existingSubmission.submitted_at).toLocaleDateString()}
                    </p>
                  </div>
                </Card>
              ) : (
                <Card className="p-6">
                  <h2 className="text-2xl font-bold mb-4">Submit Your Entry</h2>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="content">Upload Photo/Video</Label>
                      <Input
                        id="content"
                        type="file"
                        accept="image/*,video/*"
                        onChange={handleFileChange}
                        className="cursor-pointer"
                      />
                      {preview && (
                        <div className="mt-4 aspect-video bg-muted rounded-lg overflow-hidden">
                          {contentFile?.type.startsWith("video") ? (
                            <video src={preview} controls className="w-full h-full" />
                          ) : (
                            <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                          )}
                        </div>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="caption">Caption (Optional)</Label>
                      <Textarea
                        id="caption"
                        value={caption}
                        onChange={(e) => setCaption(e.target.value)}
                        placeholder="Tell us about your submission..."
                        rows={4}
                      />
                    </div>

                    <Button
                      onClick={() => submitMutation.mutate()}
                      disabled={!contentFile || submitMutation.isPending}
                      className="w-full bg-gradient-primary"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {submitMutation.isPending ? "Submitting..." : "Submit Entry"}
                    </Button>
                  </div>
                </Card>
              )
            ) : (
              <Card className="p-6 text-center">
                <Sparkles className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <h2 className="text-2xl font-bold mb-2">Sign in to participate</h2>
                <p className="text-muted-foreground mb-4">
                  Create an account to submit your entry and compete for prizes!
                </p>
                <Button onClick={() => navigate("/auth")} className="bg-gradient-primary">
                  Get Started
                </Button>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChallengeDetail;