export type AuthenticityAnalysis = {
  isAuthentic: boolean;
  confidence: number;
  reason: string;
  type: "original" | "ai_generated" | "stock_photo" | "uncertain";
};

export function advisoryModerationState(analysis: AuthenticityAnalysis) {
  const confidentlyInauthentic =
    !analysis.isAuthentic && analysis.confidence >= 80 && analysis.type !== "uncertain";

  return {
    status: "pending" as const,
    moderationStatus: confidentlyInauthentic ? "flagged" as const : "pending_review" as const,
  };
}
