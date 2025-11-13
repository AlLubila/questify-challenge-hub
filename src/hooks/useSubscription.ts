import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const useSubscription = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: subscriptionData, isLoading } = useQuery({
    queryKey: ["subscription"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("check-subscription");
      if (error) throw error;
      return data as {
        subscribed: boolean;
        product_id: string | null;
        subscription_end: string | null;
      };
    },
    refetchInterval: 60000, // Check every minute
  });

  const createCheckout = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("create-subscription-checkout");
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
        description: error.message || "Failed to create checkout session",
        variant: "destructive",
      });
    },
  });

  const openCustomerPortal = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("customer-portal");
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
        description: error.message || "Failed to open customer portal",
        variant: "destructive",
      });
    },
  });

  const refreshSubscription = () => {
    queryClient.invalidateQueries({ queryKey: ["subscription"] });
  };

  return {
    subscriptionData,
    isLoading,
    createCheckout: createCheckout.mutate,
    isCreatingCheckout: createCheckout.isPending,
    openCustomerPortal: openCustomerPortal.mutate,
    isOpeningPortal: openCustomerPortal.isPending,
    refreshSubscription,
  };
};
