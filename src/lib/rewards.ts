const MONEY_REWARD_PATTERN = /(?:[$€£]\s?\d|\d[\d.,]*\s?(?:usd|eur|gbp|dollars?|euros?|pounds?)\b|\bcash\b)/i;

export const publicRewardLabel = (reward: string, points: number) => {
  if (!reward || MONEY_REWARD_PATTERN.test(reward)) {
    return `${points} points + Weekly Spotlight badge`;
  }

  return reward;
};
