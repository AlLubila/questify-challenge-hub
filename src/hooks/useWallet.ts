import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const useWallet = () => {
  const { user } = useAuth();

  const { data: walletData, isLoading } = useQuery({
    queryKey: ["wallet", user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error("User not authenticated");

      // Get wallet balance from profile
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("wallet_balance")
        .eq("id", user.id)
        .single();

      if (profileError) throw profileError;

      // Get recent transactions
      const { data: transactions, error: transactionsError } = await supabase
        .from("wallet_transactions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (transactionsError) throw transactionsError;

      return {
        balance: profile.wallet_balance || 0,
        transactions: transactions || [],
      };
    },
    enabled: !!user?.id,
  });

  return {
    balance: walletData?.balance || 0,
    transactions: walletData?.transactions || [],
    isLoading,
  };
};
