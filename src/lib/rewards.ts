const MONEY_REWARD_PATTERN = /(?:[$€£]\s?\d|\d[\d.,]*\s?(?:usd|eur|gbp|dollars?|euros?|pounds?)\b|\bcash\b)/i;

import { Language, translate } from "@/lib/i18n";

export const publicRewardLabel = (reward: string, points: number, language: Language = "en") => {
  if (!reward || MONEY_REWARD_PATTERN.test(reward)) {
    return translate(language, "reward.default", { points });
  }

  return reward;
};
