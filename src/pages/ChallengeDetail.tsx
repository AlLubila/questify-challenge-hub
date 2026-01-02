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
import { Trophy, Clock, Users, Upload, Sparkles, ArrowLeft, Wand2, Camera, Image as ImageIcon } from "lucide-react";
import { calculateTimeLeft } from "@/hooks/useChallenges";
import { useState } from "react";
import challenge1 from "@/assets/challenge-1.jpg";
import { ImageEditorAdvanced } from "@/components/ImageEditorAdvanced";
import { useCamera } from "@/hooks/useCamera";
import { compressImage } from "@/lib/imageCompression";
import { Skeleton } from "@/components/ui/skeleton";

const ChallengeDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { takePicture, pickFromGallery, isNativePlatform } = useCamera();

  const [contentFile, setContentFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [preview, setPreview] = useState<string>("");
  const [isEditing, setIsEditing] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);

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
        .from("submissions")
        .upload(filePath, contentFile);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("submissions")
        .getPublicUrl(filePath);

      // Create submission with pending status
      const { data: submissionData, error: submitError } = await supabase
        .from("submissions")
        .insert({
          user_id: user.id,
          challenge_id: id,
          content_url: urlData.publicUrl,
          caption: caption.trim() || null,
          status: "pending",
          moderation_status: "pending",
        })
        .select()
        .single();

      if (submitError) throw submitError;

      // Verify image authenticity for image submissions
      if (contentFile.type.startsWith('image/')) {
        toast.loading("Verifying image authenticity...", { id: "verify" });
        
        try {
          const { data: verifyResult, error: verifyError } = await supabase.functions.invoke(
            "verify-image-authenticity",
            {
              body: { 
                imageUrl: urlData.publicUrl,
                submissionId: submissionData.id 
              },
            }
          );

          if (verifyError) {
            console.error("Verification error:", verifyError);
            toast.dismiss("verify");
            throw new Error(verifyError.message || "Image verification failed");
          } else if (verifyResult?.analysis && !verifyResult.analysis.isAuthentic) {
            // Image is not authentic - reject
            toast.error(
              `Submission rejected: ${verifyResult.analysis.reason || "Image appears to be AI-generated or from the internet"}`,
              { id: "verify", duration: 5000 }
            );
            throw new Error("Image failed authenticity check - AI-generated or internet-sourced images are not allowed");
          } else {
            toast.success("Image verified as authentic!", { id: "verify" });
            
            // Update status to approved
            await supabase
              .from("submissions")
              .update({ status: "approved", moderation_status: "approved" })
              .eq("id", submissionData.id);
          }
        } catch (verifyErr: any) {
          if (verifyErr.message?.includes("authenticity check")) {
            throw verifyErr;
          }
          console.error("Verification failed:", verifyErr);
          toast.dismiss("verify");
          toast.error(verifyErr.message || "Image verification failed");
          throw verifyErr;
        }
      } else {
        // For videos, auto-approve for now
        await supabase
          .from("submissions")
          .update({ status: "approved" })
          .eq("id", submissionData.id);
      }

      // Award points and update level
      if (challenge) {
        const { data: currentProfile } = await supabase
          .from("profiles")
          .select("points, xp, level")
          .eq("id", user.id)
          .single();

        if (currentProfile) {
          const newXp = (currentProfile.xp || 0) + challenge.points;
          const newLevel = Math.floor(newXp / 1000) + 1;

          await supabase
            .from("profiles")
            .update({
              points: (currentProfile.points || 0) + challenge.points,
              xp: newXp,
              level: newLevel,
            })
            .eq("id", user.id);
        }

        // Check for new badges
        await supabase.functions.invoke("award-badges", {
          body: { user_id: user.id },
        });
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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 100 * 1024 * 1024) {
        toast.error("File must be less than 100MB");
        return;
      }

      // Compress image if it's an image file
      let finalFile = file;
      if (file.type.startsWith('image/')) {
        setIsCompressing(true);
        
        try {
          finalFile = await compressImage(file, {
            maxWidth: 1920,
            maxHeight: 1920,
            quality: 0.85,
          });
        } catch (error) {
          console.error('Compression error:', error);
        } finally {
          setIsCompressing(false);
        }
      }

      setContentFile(finalFile);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(finalFile);
    }
  };

  const handleEditedImage = (editedFile: File) => {
    setContentFile(editedFile);
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(editedFile);
    setIsEditing(false);
    toast.success("Image edited successfully!");
  };

  const handleCameraCapture = async () => {
    const file = await takePicture();
    if (file) {
      // Compress the captured image
      setIsCompressing(true);
      
      try {
        const compressedFile = await compressImage(file, {
          maxWidth: 1920,
          maxHeight: 1920,
          quality: 0.85,
        });
        
        setContentFile(compressedFile);
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreview(reader.result as string);
        };
        reader.readAsDataURL(compressedFile);
      } catch (error) {
        console.error('Compression error:', error);
        setContentFile(file);
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreview(reader.result as string);
        };
        reader.readAsDataURL(file);
      } finally {
        setIsCompressing(false);
      }
    }
  };

  const handleGalleryPick = async () => {
    const file = await pickFromGallery();
    if (file) {
      // Compress the selected image
      setIsCompressing(true);
      
      try {
        const compressedFile = await compressImage(file, {
          maxWidth: 1920,
          maxHeight: 1920,
          quality: 0.85,
        });
        
        setContentFile(compressedFile);
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreview(reader.result as string);
        };
        reader.readAsDataURL(compressedFile);
      } catch (error) {
        console.error('Compression error:', error);
        setContentFile(file);
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreview(reader.result as string);
        };
        reader.readAsDataURL(file);
      } finally {
        setIsCompressing(false);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-8 space-y-6">
          <Skeleton className="h-10 w-32" />
          <Card className="overflow-hidden">
            <Skeleton className="w-full h-80" />
            <div className="p-6 space-y-6">
              <div>
                <Skeleton className="h-8 w-3/4 mb-3" />
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-2/3 mt-2" />
              </div>
              <div className="flex gap-4">
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-6 w-24" />
              </div>
              <Skeleton className="h-12 w-full" />
            </div>
          </Card>
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
                    {!isEditing ? (
                      <>
                        <div className="space-y-3">
                          <Label>Capture or Upload Photo/Video</Label>
                          
                          {isNativePlatform && (
                            <div className="grid grid-cols-2 gap-3">
                              <Button
                                type="button"
                                variant="outline"
                                onClick={handleCameraCapture}
                                disabled={isCompressing}
                                className="w-full"
                              >
                                <Camera className="w-4 h-4 mr-2" />
                                Take Photo
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                onClick={handleGalleryPick}
                                disabled={isCompressing}
                                className="w-full"
                              >
                                <ImageIcon className="w-4 h-4 mr-2" />
                                Choose from Gallery
                              </Button>
                            </div>
                          )}
                          
                          <div>
                            <Label htmlFor="content" className="text-sm text-muted-foreground">
                              {isNativePlatform ? 'Or select a file' : 'Select Photo/Video'}
                            </Label>
                            <Input
                              id="content"
                              type="file"
                              accept="image/*,video/*"
                              onChange={handleFileChange}
                              disabled={isCompressing}
                              className="cursor-pointer"
                            />
                          </div>
                          
                          {preview && (
                            <div className="mt-4 space-y-2">
                              <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                                {contentFile?.type.startsWith("video") ? (
                                  <video src={preview} controls className="w-full h-full" />
                                ) : (
                                  <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                                )}
                              </div>
                              {contentFile?.type.startsWith("image") && (
                                <Button
                                  variant="outline"
                                  onClick={() => setIsEditing(true)}
                                  className="w-full"
                                >
                                  <Wand2 className="w-4 h-4 mr-2" />
                                  Edit Image
                                </Button>
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
                      </>
                    ) : (
                      contentFile && (
                        <ImageEditorAdvanced
                          imageFile={contentFile}
                          onSave={handleEditedImage}
                          onCancel={() => setIsEditing(false)}
                        />
                      )
                    )}
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