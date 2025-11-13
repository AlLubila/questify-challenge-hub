import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Challenge {
  id: string;
  title: string;
  description: string;
  image_url: string | null;
  prize: string;
  difficulty: "easy" | "medium" | "hard";
  points: number;
  start_date: string;
  end_date: string;
  challenge_type: "daily" | "weekly";
  is_ai_generated: boolean;
  participants_count: number;
  created_at: string;
}

export const useChallenges = () => {
  return useQuery({
    queryKey: ["challenges"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("challenges")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(6);

      if (error) throw error;
      return data as Challenge[];
    },
  });
};

export const calculateTimeLeft = (endDate: string): string => {
  const end = new Date(endDate);
  const now = new Date();
  const diff = end.getTime() - now.getTime();

  if (diff <= 0) return "Ended";

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  if (days > 0) {
    return `${days}d ${hours}h left`;
  }
  return `${hours}h left`;
};