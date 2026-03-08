export const rankingsEnabled = () =>
  (process.env.AI_RANKINGS_ENABLED || process.env.NEXT_PUBLIC_AI_RANKINGS_ENABLED || "false").toLowerCase() === "true";

export const rankingsNavEnabled = () =>
  (process.env.AI_RANKINGS_ENABLED || process.env.NEXT_PUBLIC_AI_RANKINGS_ENABLED || "false").toLowerCase() === "true";
