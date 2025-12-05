import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const useChallengeRecommendations = (limit: number = 5) => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ["challenge-recommendations", limit, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("get-challenge-recommendations", {
        body: { limit },
      });

      if (error) throw error;
      return data.recommendations;
    },
    enabled: !!user, // Only fetch when user is logged in
  });
};
