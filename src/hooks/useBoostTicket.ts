import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export type BoostType = "small" | "medium" | "large";

export const useBoostTicket = () => {
  const { toast } = useToast();

  const purchaseBoost = useMutation({
    mutationFn: async ({ boostType, submissionId }: { boostType: BoostType; submissionId: string }) => {
      const { data, error } = await supabase.functions.invoke("create-boost-checkout", {
        body: { boostType, submissionId },
      });
      if (error) throw error;
      return data as { url: string };
    },
    onSuccess: (data) => {
      if (data.url) {
        window.open(data.url, "_blank");
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create boost checkout",
        variant: "destructive",
      });
    },
  });

  return {
    purchaseBoost: purchaseBoost.mutate,
    isPurchasing: purchaseBoost.isPending,
  };
};
