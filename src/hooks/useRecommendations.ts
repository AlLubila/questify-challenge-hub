import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface RecommendedUser {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  points: number;
  level: number;
}

export const useRecommendations = (limit: number = 10) => {
  return useQuery({
    queryKey: ["recommendations", limit],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("get-user-recommendations", {
        body: { limit },
      });

      if (error) throw error;
      return data.recommendations as RecommendedUser[];
    },
  });
};
