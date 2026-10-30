import { localizeChallenge } from "@/lib/localizedContent";
import { isNativeApp } from '@/lib/mobile';
import { dateLocales } from "@/lib/dateLocales";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { useSubscription } from "@/hooks/useSubscription";
import { Navigate, useSearchParams, useParams } from "react-router-dom";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Flag, Trophy, Zap, Upload, Save, Award, Crown, Users, Pencil } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { FollowButton } from "@/components/FollowButton";
import { FollowersModal } from "@/pages/FollowersModal";
import { ReEditSubmissionDialog } from "@/components/ReEditSubmissionDialog";
import { ProfileHeaderSkeleton } from "@/components/skeletons/ProfileHeaderSkeleton";
import { SubmissionCardSkeleton } from "@/components/skeletons/SubmissionCardSkeleton";
import PullToRefresh from "react-simple-pull-to-refresh";

const Profile = () => {
  const { t, language } = useLanguage();
  const { user, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const { userId: pathUserId } = useParams();
  
  // Get userId from URL path params (if viewing another user's profile), fallback to query params, then to current user
  const viewedUserId = pathUserId || searchParams.get("userId") || user?.id;
  const isOwnProfile = user?.id === viewedUserId;
  
  // Fetch the profile of the user being viewed
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["profile", viewedUserId, isOwnProfile],
    queryFn: async () => {
      if (!viewedUserId) return null;
      
      if (isOwnProfile) {
        // User can see their own full profile including financial data
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", viewedUserId)
          .maybeSingle();
        
        if (error) throw error;
        return data;
      } else {
        // Use public_profiles view for other users (excludes sensitive financial data)
        const { data, error } = await supabase
          .from("public_profiles")
          .select("*")
          .eq("id", viewedUserId)
          .maybeSingle();
        
        if (error) throw error;
        return data;
      }
    },
    enabled: !!viewedUserId,
  });
  
  const { subscriptionData, createCheckout, isCreatingCheckout, openCustomerPortal, isOpeningPortal } = useSubscription(isOwnProfile);
  const [followersModalOpen, setFollowersModalOpen] = useState(false);
  const [followersModalTab, setFollowersModalTab] = useState<"followers" | "following">("followers");

  const subscriptionSuccess = searchParams.get("subscription_success");
  const sessionId = searchParams.get("session_id");

  useEffect(() => {
    const processSubscriptionSuccess = async () => {
      if (isOwnProfile && subscriptionSuccess === "true" && sessionId) {
        try {
          const { error } = await supabase.functions.invoke("process-payment-success", {
            body: { sessionId },
          });
          
          if (error) throw error;
          
          toast.success(t("Creator Pass Activated! 🎉"), {
            description: "Your subscription is now active. Enjoy exclusive perks!",
          });
        } catch (error) {
          console.error("Error processing subscription:", error);
        } finally {
          // Clear the URL parameters
          searchParams.delete("subscription_success");
          searchParams.delete("session_id");
          setSearchParams(searchParams);
        }
      }
    };

    processSubscriptionSuccess();
  }, [isOwnProfile, subscriptionSuccess, sessionId, searchParams, setSearchParams]);

  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>("");

  // Fetch user badges
  const { data: userBadges } = useQuery({
    queryKey: ["user-badges", viewedUserId],
    queryFn: async () => {
      if (!viewedUserId) return [];
      const { data, error } = await supabase
        .from("user_badges")
        .select("*, badges(*)")
        .eq("user_id", viewedUserId)
        .order("earned_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!viewedUserId,
  });

  // Fetch user submissions
  const { data: submissions } = useQuery({
    queryKey: ["user-submissions", viewedUserId, isOwnProfile],
    queryFn: async () => {
      if (!viewedUserId) return [];
      let query = supabase
        .from("submissions")
        .select("*, challenges(*)")
        .eq("user_id", viewedUserId);

      if (!isOwnProfile) {
        query = query.eq("status", "approved");
      }

      const { data, error } = await query.order("submitted_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!viewedUserId,
  });

  const updateProfileMutation = useMutation({
    mutationFn: async () => {
      if (!user || !profile) return;

      let avatarUrl = profile.avatar_url;

      // Upload new avatar if selected
      if (avatarFile) {
        const fileExt = avatarFile.name.split(".").pop();
        const filePath = `${user.id}/avatar.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(filePath, avatarFile, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("avatars")
          .getPublicUrl(filePath);

        avatarUrl = urlData.publicUrl;
      }

      const { error } = await supabase
        .from("profiles")
        .update({
          display_name: displayName || profile.display_name,
          bio: bio || profile.bio,
          avatar_url: avatarUrl,
        })
        .eq("id", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success(t("Profile updated successfully!"));
      setIsEditing(false);
      setAvatarFile(null);
      setAvatarPreview("");
    },
    onError: (error: any) => {
      toast.error(t(error.message || "Failed to update profile"));
    },
  });

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error(t("Avatar must be less than 5MB"));
        return;
      }
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleEditToggle = () => {
    if (!isEditing && profile) {
      setDisplayName(profile.display_name || "");
      setBio(profile.bio || "");
    }
    setIsEditing(!isEditing);
  };

  const handleRefresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["profile", viewedUserId] });
    await queryClient.invalidateQueries({ queryKey: ["user-submissions", viewedUserId] });
    await queryClient.invalidateQueries({ queryKey: ["user-badges", viewedUserId] });
  };

  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-8">
          <ProfileHeaderSkeleton />
          <div className="mt-8 space-y-6">
            {[1, 2].map((i) => (
              <SubmissionCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Only require auth if viewing own profile (no userId in path)
  if (!user && !pathUserId) {
    return <Navigate to="/auth" replace />;
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-20 text-center">
          <p className="text-muted-foreground">{t("Profile not found")}</p>
        </div>
      </div>
    );
  }

  return (
    <PullToRefresh onRefresh={handleRefresh} pullingContent="">
      <div className="min-h-screen bg-background">
        <Header />

        <div className="container py-8 space-y-8">
        {/* Profile Header */}
        <Card className="p-8">
          <div className="flex flex-col md:flex-row gap-8">
            <div className="flex flex-col items-center gap-4">
              <Avatar className="h-32 w-32 border-4 border-primary/20">
                <AvatarImage 
                  src={avatarPreview || profile.avatar_url || undefined} 
                  alt={profile.username} 
                />
                <AvatarFallback className="bg-primary text-primary-foreground text-3xl">
                  {profile.username.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {isEditing && (
                <div>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                    id="avatar-upload"
                  />
                  <Label htmlFor="avatar-upload">
                    <Button variant="outline" size="sm" asChild>
                      <span className="cursor-pointer">
                        <Upload className="w-4 h-4 mr-2" />
                        {t("Upload Avatar")}
                      </span>
                    </Button>
                  </Label>
                </div>
              )}
            </div>

            <div className="flex-1 space-y-4">
              {isEditing ? (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="display-name">{t("Display Name")}</Label>
                    <Input
                      id="display-name"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder={profile.username}
                    />
                  </div>
                  <div>
                    <Label htmlFor="bio">{t("Bio")}</Label>
                    <Textarea
                      id="bio"
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder={t("Tell us about yourself...")}
                      rows={3}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => updateProfileMutation.mutate()}
                      disabled={updateProfileMutation.isPending}
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {t("Save Changes")}
                    </Button>
                    <Button variant="outline" onClick={handleEditToggle}>
                      {t("Cancel")}
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <h1 className="text-3xl font-bold text-foreground">
                      {profile.display_name || profile.username}
                    </h1>
                    <p className="text-muted-foreground">@{profile.username}</p>
                  </div>
                  {profile.bio && (
                    <p className="text-foreground">{profile.bio}</p>
                  )}
                  <div className="flex gap-2">
                    {isOwnProfile ? (
                      <Button onClick={handleEditToggle}>{t("Edit Profile")}</Button>
                    ) : (
                      <FollowButton userId={viewedUserId!} />
                    )}
                  </div>
                </>
              )}

              <div className="grid grid-cols-2 gap-3 pt-4 sm:grid-cols-3 lg:grid-cols-5 lg:gap-4">
                <Card 
                  className="p-4 text-center cursor-pointer hover:bg-accent/50 transition-colors"
                  onClick={() => {
                    setFollowersModalTab("followers");
                    setFollowersModalOpen(true);
                  }}
                >
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Users className="w-4 h-4 text-primary" />
                    <p className="text-2xl font-bold">{profile.followers_count || 0}</p>
                  </div>
                  <p className="text-sm text-muted-foreground">{t("Followers")}</p>
                </Card>
                <Card 
                  className="p-4 text-center cursor-pointer hover:bg-accent/50 transition-colors"
                  onClick={() => {
                    setFollowersModalTab("following");
                    setFollowersModalOpen(true);
                  }}
                >
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Users className="w-4 h-4 text-accent" />
                    <p className="text-2xl font-bold">{profile.following_count || 0}</p>
                  </div>
                  <p className="text-sm text-muted-foreground">{t("Following")}</p>
                </Card>
                <Card className="p-4 text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Flag className="w-4 h-4 text-accent" />
                    <p className="text-2xl font-bold">{profile.points}</p>
                  </div>
                  <p className="text-sm text-muted-foreground">{t("Points")}</p>
                </Card>
                <Card className="p-4 text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Zap className="w-4 h-4 text-primary" />
                    <p className="text-2xl font-bold">{profile.xp}</p>
                  </div>
                  <p className="text-sm text-muted-foreground">XP</p>
                </Card>
                <Card className="p-4 text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Trophy className="w-4 h-4 text-secondary" />
                    <p className="text-2xl font-bold">{profile.level}</p>
                  </div>
                  <p className="text-sm text-muted-foreground">{t("Level")}</p>
                </Card>
              </div>
            </div>
          </div>
        </Card>

        {/* Tabs for Badges, Submissions, and Subscription */}
        <Tabs defaultValue="badges" className="w-full">
            <TabsList className={`grid w-full ${isOwnProfile && !isNativeApp() ? "grid-cols-3" : "grid-cols-2"}`}>
              <TabsTrigger value="badges">{t("Badges (")}{userBadges?.length || 0})</TabsTrigger>
              <TabsTrigger value="submissions">{t("Submissions (")}{submissions?.length || 0})</TabsTrigger>
              {isOwnProfile && !isNativeApp() && <TabsTrigger value="subscription">{t("Subscription")}</TabsTrigger>}
          </TabsList>

          <TabsContent value="badges" className="space-y-4">
            {userBadges && userBadges.length > 0 ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {userBadges.map((userBadge: any) => (
                  <Card key={userBadge.id} className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="text-4xl">{userBadge.badges.icon}</div>
                      <div className="flex-1">
                        <h3 className="font-bold text-lg">{t(userBadge.badges.name)}</h3>
                        <p className="text-sm text-muted-foreground mb-2">
                          {t(userBadge.badges.description)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {t("Earned")} {new Date(userBadge.earned_at).toLocaleDateString(language)}
                        </p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="p-12 text-center">
                <Award className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-xl font-bold mb-2">{t("No badges yet")}</h3>
                <p className="text-muted-foreground">
                  {t("Complete challenges to earn badges!")}
                </p>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="submissions" className="space-y-4">
            {submissions && submissions.length > 0 ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {submissions.map((submission: any) => (
                  <Card key={submission.id} className="overflow-hidden">
                     <div className="aspect-video bg-muted relative">
                       {/\.(mp4|webm|ogg|mov)(?:$|[?#])/i.test(submission.content_url) ? (
                         <video
                           src={submission.content_url}
                           controls
                           preload="metadata"
                           className="h-full w-full object-cover"
                           aria-label={t("submission.videoFor", { title: localizeChallenge(submission.challenges, language).title })}
                         />
                       ) : (
                         <img
                           src={submission.content_url}
                           alt={t("submission.for", { title: localizeChallenge(submission.challenges, language).title })}
                           loading="lazy"
                           className="w-full h-full object-cover"
                         />
                       )}
                       <Badge className="absolute top-2 right-2">
                         {submission.status}
                       </Badge>
                       {isOwnProfile && (
                         <ReEditSubmissionDialog submission={submission}>
                           <Button
                             size="sm"
                             variant="secondary"
                             className="absolute bottom-2 right-2 gap-1"
                           >
                             <Pencil className="w-3 h-3" />
                             {t("Edit")}
                           </Button>
                         </ReEditSubmissionDialog>
                       )}
                     </div>
                     <div className="p-4">
                       <h3 className="font-bold mb-1">{localizeChallenge(submission.challenges, language).title}</h3>
                       {submission.caption && (
                         <p className="text-sm text-muted-foreground mb-2">
                           {submission.caption}
                         </p>
                       )}
                       <div className="flex items-center gap-4 text-sm">
                         <span className="flex items-center gap-1">
                           <Trophy className="w-4 h-4 text-accent" />
                           {submission.votes} {t("votes")}
                         </span>
                         <span className="text-muted-foreground">
                           {new Date(submission.submitted_at).toLocaleDateString(language)}
                         </span>
                       </div>
                     </div>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="p-12 text-center">
                <Flag className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-xl font-bold mb-2">{t("No submissions yet")}</h3>
                <p className="text-muted-foreground">
                  {t("Join a challenge and submit your first entry!")}
                </p>
              </Card>
            )}
          </TabsContent>

          {isOwnProfile && !isNativeApp() && <TabsContent value="subscription" className="space-y-4">
            <Card className="p-8">
              <div className="flex items-start gap-4 mb-6">
                <div className="p-3 rounded-full bg-primary">
                  <Crown className="h-6 w-6 text-primary-foreground" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold mb-2">{t("Creator Pass")}</h2>
                  <p className="text-muted-foreground">
                    {t("Get exclusive perks, extra rewards, and premium features for $5/month")}
                  </p>
                </div>
              </div>

              {subscriptionData?.subscribed ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Badge variant="default" className="text-lg px-4 py-1">{t("Active")}</Badge>
                    {subscriptionData.subscription_end && (
                      <span className="text-sm text-muted-foreground">
                        {t("Renews on")} {format(new Date(subscriptionData.subscription_end), "PPP", { locale: dateLocales[language] })}
                      </span>
                    )}
                  </div>
                  
                  <div className="bg-muted rounded-lg p-6 space-y-3">
                    <h3 className="font-semibold mb-3">{t("Your Benefits:")}</h3>
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-primary" />
                      <span className="text-sm">{t("2x Challenge Rewards")}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Trophy className="h-4 w-4 text-primary" />
                      <span className="text-sm">{t("Exclusive Creator Badge")}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Flag className="h-4 w-4 text-primary" />
                      <span className="text-sm">{t("Access to Premium Stats")}</span>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    onClick={() => openCustomerPortal()}
                    disabled={isOpeningPortal}
                  >
                    {t("Manage Subscription")}
                  </Button>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="bg-muted rounded-lg p-6 space-y-3">
                    <h3 className="font-semibold mb-3">{t("What You'll Get:")}</h3>
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-primary" />
                      <span className="text-sm">{t("2x Challenge Rewards")}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Trophy className="h-4 w-4 text-primary" />
                      <span className="text-sm">{t("Exclusive Creator Badge")}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Flag className="h-4 w-4 text-primary" />
                      <span className="text-sm">{t("Access to Premium Stats")}</span>
                    </div>
                  </div>

                  <Button
                    className="bg-primary"
                    onClick={() => createCheckout()}
                    disabled={isCreatingCheckout}
                  >
                    {t("Subscribe for $5/month")}
                  </Button>
                </div>
              )}
            </Card>
          </TabsContent>}
        </Tabs>
      </div>
      
      {/* Followers Modal */}
      <FollowersModal
        userId={viewedUserId!}
        isOpen={followersModalOpen}
        onClose={() => setFollowersModalOpen(false)}
        defaultTab={followersModalTab}
      />
    </div>
    </PullToRefresh>
  );
};

export default Profile;
