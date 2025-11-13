import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const useReferrals = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["referrals", user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error("User not authenticated");

      // Get referrals where user is the referrer
      const { data: referrals, error: referralsError } = await supabase
        .from("referrals")
        .select(`
          *,
          referred:referred_id (
            id,
            username,
            display_name,
            avatar_url,
            created_at
          )
        `)
        .eq("referrer_id", user.id)
        .order("created_at", { ascending: false });

      if (referralsError) throw referralsError;

      // Get user's profile with referral stats
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("referral_code, referral_count, referral_earnings")
        .eq("id", user.id)
        .single();

      if (profileError) throw profileError;

      return {
        referrals: referrals || [],
        referralCode: profile.referral_code,
        referralCount: profile.referral_count || 0,
        referralEarnings: profile.referral_earnings || 0,
      };
    },
    enabled: !!user?.id,
  });
};
