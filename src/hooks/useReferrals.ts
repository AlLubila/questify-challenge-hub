import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const useReferrals = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["referrals", user?.id],
    queryFn: async () => {
      if (!user) return null;

      // Get user's referral stats from profile
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("referral_code, referral_count, referral_earnings")
        .eq("id", user.id)
        .single();

      if (profileError) throw profileError;

      // Get list of referred users
      const { data: referrals, error: referralsError } = await supabase
        .from("referrals")
        .select(`
          *,
          referred:profiles!referrals_referred_id_fkey(
            username,
            display_name,
            avatar_url
          )
        `)
        .eq("referrer_id", user.id)
        .order("created_at", { ascending: false });

      if (referralsError) throw referralsError;

      return {
        referralCode: profile.referral_code,
        totalReferrals: profile.referral_count || 0,
        totalEarnings: profile.referral_earnings || 0,
        referrals: referrals || [],
      };
    },
    enabled: !!user,
  });
};
