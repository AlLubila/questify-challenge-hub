import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export const useFollow = (userId: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: isFollowing, isLoading } = useQuery({
    queryKey: ["isFollowing", userId, user?.id],
    queryFn: async () => {
      if (!user) return false;
      
      const { data, error } = await supabase
        .from("follows")
        .select("id")
        .eq("follower_id", user.id)
        .eq("following_id", userId)
        .maybeSingle();

      if (error) throw error;
      return !!data;
    },
    enabled: !!user && !!userId && user.id !== userId,
  });

  const followMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Must be logged in");
      
      const { error } = await supabase
        .from("follows")
        .insert({
          follower_id: user.id,
          following_id: userId,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["isFollowing", userId] });
      queryClient.invalidateQueries({ queryKey: ["profile", userId] });
      queryClient.invalidateQueries({ queryKey: ["followers"] });
      queryClient.invalidateQueries({ queryKey: ["following"] });
      toast.success("Followed successfully!");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to follow");
    },
  });

  const unfollowMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Must be logged in");
      
      const { error } = await supabase
        .from("follows")
        .delete()
        .eq("follower_id", user.id)
        .eq("following_id", userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["isFollowing", userId] });
      queryClient.invalidateQueries({ queryKey: ["profile", userId] });
      queryClient.invalidateQueries({ queryKey: ["followers"] });
      queryClient.invalidateQueries({ queryKey: ["following"] });
      toast.success("Unfollowed successfully!");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to unfollow");
    },
  });

  return {
    isFollowing: isFollowing || false,
    isLoading,
    follow: followMutation.mutate,
    unfollow: unfollowMutation.mutate,
    isPending: followMutation.isPending || unfollowMutation.isPending,
  };
};

export const useFollowers = (userId: string) => {
  return useQuery({
    queryKey: ["followers", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("follows")
        .select(`
          follower_id,
          profiles:follower_id (
            id,
            username,
            display_name,
            avatar_url
          )
        `)
        .eq("following_id", userId);

      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });
};

export const useFollowing = (userId: string) => {
  return useQuery({
    queryKey: ["following", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("follows")
        .select(`
          following_id,
          profiles:following_id (
            id,
            username,
            display_name,
            avatar_url
          )
        `)
        .eq("follower_id", userId);

      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });
};