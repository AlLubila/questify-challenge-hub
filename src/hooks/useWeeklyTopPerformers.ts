import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface TopPerformer {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  level: number;
  weeklyPoints: number;
}

export const useWeeklyTopPerformers = (limit: number = 5) => {
  return useQuery({
    queryKey: ["weekly-top-performers", limit],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("get-weekly-top-performers", {
        body: { limit },
      });

      if (error) throw error;
      return data.topPerformers as TopPerformer[];
    },
  });
};
