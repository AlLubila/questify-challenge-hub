import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Trash2, Users } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const ChallengeModeration = () => {
  const queryClient = useQueryClient();

  const { data: challenges, isLoading } = useQuery({
    queryKey: ["adminChallenges"],
    queryFn: async () => {
      const { data: challengesData, error: challengesError } = await supabase
        .from("challenges")
        .select("*")
        .order("created_at", { ascending: false });

      if (challengesError) throw challengesError;

      // Fetch creator profiles separately
      const creatorIds = challengesData
        .map((c) => c.created_by)
        .filter((id) => id !== null);

      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, username, display_name")
        .in("id", creatorIds);

      if (profilesError) throw profilesError;

      // Merge profiles with challenges
      return challengesData.map((challenge) => ({
        ...challenge,
        profile: profiles?.find((p) => p.id === challenge.created_by) || null,
      }));
    },
  });

  const deleteChallenge = useMutation({
    mutationFn: async (challengeId: string) => {
      const { error } = await supabase
        .from("challenges")
        .delete()
        .eq("id", challengeId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminChallenges"] });
      toast.success("Challenge deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete challenge");
    },
  });

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
      <h1 className="text-3xl font-bold">Challenge Moderation</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {challenges?.map((challenge) => (
          <Card key={challenge.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <CardTitle className="text-lg">{challenge.title}</CardTitle>
                {challenge.is_ai_generated && (
                  <Badge variant="secondary">AI Generated</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {challenge.image_url && (
                <img
                  src={challenge.image_url}
                  alt={challenge.title}
                  className="w-full h-48 object-cover rounded-md"
                />
              )}
              <p className="text-sm text-muted-foreground line-clamp-3">
                {challenge.description}
              </p>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  <span>{challenge.participants_count} participants</span>
                </div>
                <Badge variant="outline">{challenge.difficulty}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-sm">
                  <p className="font-medium">Prize: {challenge.prize}</p>
                  <p className="text-muted-foreground">
                    {challenge.points} points
                  </p>
                </div>
                {challenge.profile && (
                  <p className="text-xs text-muted-foreground">
                    By {challenge.profile.display_name || challenge.profile.username}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="w-full"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Challenge?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete "{challenge.title}" and all
                        associated submissions. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => deleteChallenge.mutate(challenge.id)}
                        className="bg-destructive text-destructive-foreground"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
