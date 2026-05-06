import { CATEGORIES, loadPatterns } from "./patterns";
import type { Category, Signals } from "./types";

const MIN_CATEGORY_SCORE = 2;

export interface ClassifyResult {
  category: Category;
  scores: Record<Category, number>;
  confident: boolean;
}

export function classify(signals: Signals, hint?: Category): ClassifyResult {
  const { weightsByCategory } = loadPatterns();

  const scores: Record<Category, number> = {
    job: 0,
    investment: 0,
    loan: 0,
    task: 0,
    courier: 0,
    unknown: 0
  };

  for (const cat of CATEGORIES) {
    const weights = weightsByCategory[cat];
    let score = 0;
    for (const [signal, weight] of Object.entries(weights)) {
      if (signals[signal] === true) score += weight;
    }
    scores[cat] = score;
  }

  if (hint && hint !== "unknown") {
    scores[hint] += 2;
  }

  let bestCat: Category = "unknown";
  let bestScore = 0;
  for (const cat of CATEGORIES) {
    if (scores[cat] > bestScore) {
      bestScore = scores[cat];
      bestCat = cat;
    }
  }

  const confident = bestScore >= MIN_CATEGORY_SCORE;
  return { category: confident ? bestCat : "unknown", scores, confident };
}
