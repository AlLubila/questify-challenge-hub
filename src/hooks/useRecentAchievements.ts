import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface Achievement {
  id: string;
  earned_at: string;
  user_id: string;
  badge_id: string;
  profiles: {
    id: string;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
    level: number;
  };
  badges: {
    id: string;
    name: string;
    description: string;
    icon: string | null;
  };
}

export const useRecentAchievements = (limit: number = 10) => {
  return useQuery({
    queryKey: ["recent-achievements", limit],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("get-recent-achievements", {
        body: { limit },
      });

      if (error) throw error;
      return data.achievements as Achievement[];
    },
  });
};
