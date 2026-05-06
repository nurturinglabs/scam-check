import { CATEGORY_LABEL, loadPatterns } from "./patterns";
import type { Category, FinalVerdict, RedFlagRule, Severity, Signals, Verdict } from "./types";

const SEVERITY_WEIGHT: Record<Severity, number> = { low: 1, medium: 2, high: 4 };

const HIGH_THRESHOLD = 4;
const MEDIUM_THRESHOLD = 2;

function ruleFires(rule: RedFlagRule, signals: Signals): boolean {
  if (rule.requires_all && rule.requires_all.length > 0) {
    for (const s of rule.requires_all) {
      if (signals[s] !== true) return false;
    }
  }
  if (rule.requires_any && rule.requires_any.length > 0) {
    let any = false;
    for (const s of rule.requires_any) {
      if (signals[s] === true) {
        any = true;
        break;
      }
    }
    if (!any) return false;
  }
  return true;
}

function maxSeverity(a: Severity, b: Severity): Severity {
  return SEVERITY_WEIGHT[a] >= SEVERITY_WEIGHT[b] ? a : b;
}

export function evaluate(category: Category, signals: Signals): FinalVerdict {
  const { rulesByCategory, commonRules, nextStepsByCategory, commonNextSteps } = loadPatterns();

  const fired: RedFlagRule[] = [];
  const firedIds = new Set<string>();

  const candidateRules = [...(rulesByCategory[category] ?? []), ...commonRules];
  for (const rule of candidateRules) {
    if (firedIds.has(rule.id)) continue;
    if (ruleFires(rule, signals)) {
      fired.push(rule);
      firedIds.add(rule.id);
    }
  }

  let totalSeverity = 0;
  let topSeverity: Severity = "low";
  for (const r of fired) {
    totalSeverity += SEVERITY_WEIGHT[r.severity];
    topSeverity = maxSeverity(topSeverity, r.severity);
  }

  let verdict: Verdict;
  if (fired.length === 0) {
    verdict = "probably_safe";
  } else if (
    totalSeverity >= HIGH_THRESHOLD ||
    fired.some((r) => r.severity === "high")
  ) {
    verdict = "likely_scam";
  } else if (totalSeverity >= MEDIUM_THRESHOLD) {
    verdict = "need_more_info";
  } else {
    verdict = "need_more_info";
  }

  const finalSeverity: Severity =
    verdict === "likely_scam" ? "high" : verdict === "need_more_info" ? "medium" : "low";

  const nextStepsSet: string[] = [];
  const seen = new Set<string>();
  for (const s of nextStepsByCategory[category] ?? []) {
    if (!seen.has(s)) {
      seen.add(s);
      nextStepsSet.push(s);
    }
  }
  for (const s of commonNextSteps) {
    if (!seen.has(s)) {
      seen.add(s);
      nextStepsSet.push(s);
    }
  }

  const reasoning =
    fired.length === 0
      ? "We did not find any of the typical scam red flags in this message. That does not guarantee it is genuine — verify the company / lender / sender independently before sharing money or documents."
      : `We detected ${fired.length} red flag${fired.length === 1 ? "" : "s"} commonly used in ${CATEGORY_LABEL[category].toLowerCase()} scams in India. ` +
        fired.map((f) => f.red_flag).join(" ");

  return {
    category,
    category_label: CATEGORY_LABEL[category],
    verdict,
    severity: finalSeverity,
    red_flags: fired.map((f) => f.red_flag),
    next_steps: verdict === "probably_safe" ? nextStepsSet.slice(-3) : nextStepsSet,
    reasoning,
    signals,
    fired_rule_ids: fired.map((f) => f.id)
  };
}
