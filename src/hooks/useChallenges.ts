import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Language, translate } from "@/lib/i18n";
import { useLanguage } from "@/contexts/LanguageContext";
import { localizeChallenge } from "@/lib/localizedContent";

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
  translations?: unknown;
  source_language?: string;
}

export const useChallenges = () => {
  const { language } = useLanguage();
  return useQuery({
    queryKey: ["challenges"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("challenges")
        .select("*")
        .eq("publish_status", "published")
        .order("end_date", { ascending: false })
        .limit(6);

      if (error) throw error;
      return data as Challenge[];
    },
    select: (challenges) => challenges.map((challenge) => localizeChallenge(challenge, language)),
  });
};

export const calculateTimeLeft = (endDate: string, language: Language = "en"): string => {
  const end = new Date(endDate);
  const now = new Date();
  const diff = end.getTime() - now.getTime();

  if (diff <= 0) return translate(language, "time.ended");

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  if (days > 0) {
    return translate(language, "time.days", { days, hours });
  }
  return translate(language, "time.hours", { hours });
};
