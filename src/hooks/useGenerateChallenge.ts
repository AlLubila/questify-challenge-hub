import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface GenerateChallengeParams {
  type: "daily" | "weekly";
  count?: number;
}

export const useGenerateChallenge = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ type, count = 1 }: GenerateChallengeParams) => {
      const { data, error } = await supabase.functions.invoke("generate-challenge", {
        body: { type, count },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["challenges"] });
      toast.success(data.message || "Challenges generated successfully!");
    },
    onError: (error: any) => {
      console.error("Challenge generation error:", error);
      
      if (error.message?.includes("429") || error.message?.includes("Rate limit")) {
        toast.error("Rate limit reached. Please try again later.");
      } else if (error.message?.includes("402") || error.message?.includes("credits")) {
        toast.error("AI credits exhausted. Please add credits to continue.");
      } else {
        toast.error("Failed to generate challenges. Please try again.");
      }
    },
  });
};