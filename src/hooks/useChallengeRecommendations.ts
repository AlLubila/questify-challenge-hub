import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useChallengeRecommendations = (limit: number = 5) => {
  return useQuery({
    queryKey: ["challenge-recommendations", limit],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("get-challenge-recommendations", {
        body: { limit },
      });

      if (error) throw error;
      return data.recommendations;
    },
  });
};
