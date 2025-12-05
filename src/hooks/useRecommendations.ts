import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface RecommendedUser {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  points: number;
  level: number;
}

export const useRecommendations = (limit: number = 10) => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ["recommendations", limit, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("get-user-recommendations", {
        body: { limit },
      });

      if (error) throw error;
      return data.recommendations as RecommendedUser[];
    },
    enabled: !!user, // Only fetch when user is logged in
  });
};
