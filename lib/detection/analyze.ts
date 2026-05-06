import { classify } from "./classifier";
import { extract } from "./extractor";
import { evaluateInstantFail } from "./instant_fail";
import { applyAnswer, pickNextQuestion } from "./next_question";
import { CATEGORY_LABEL } from "./patterns";
import { evaluate } from "./rules";
import type {
  AnalyzeRequest,
  AnalyzeResponse,
  Category,
  FinalVerdict,
  Signals
} from "./types";

const MAX_FOLLOW_UPS = 3;

function mergePriorSignals(extracted: Signals, prior: Signals | null | undefined): Signals {
  if (!prior) return extracted;
  const merged: Signals = { ...extracted };
  for (const [k, v] of Object.entries(prior)) {
    if (k === "payment_amount") {
      if (merged.payment_amount == null && typeof v === "number") merged.payment_amount = v;
    } else if (v === true) {
      merged[k] = true;
    }
  }
  return merged;
}

function buildInstantFailVerdict(
  signals: Signals,
  hits: ReturnType<typeof evaluateInstantFail>
): FinalVerdict {
  const primary = hits[0];
  const ruleVerdict = evaluate(primary.category, signals);

  const ruleIds = [...hits.map((h) => h.rule_id)];
  const seen = new Set(ruleIds);
  const flags = hits.map((h) => h.red_flag);
  for (let i = 0; i < ruleVerdict.fired_rule_ids.length; i++) {
    const id = ruleVerdict.fired_rule_ids[i];
    if (!seen.has(id)) {
      ruleIds.push(id);
      flags.push(ruleVerdict.red_flags[i]);
      seen.add(id);
    }
  }

  return {
    category: primary.category,
    category_label: CATEGORY_LABEL[primary.category],
    verdict: "likely_scam",
    severity: "high",
    red_flags: flags,
    next_steps: ruleVerdict.next_steps,
    reasoning:
      "We saw a pattern that's almost never present in genuine offers. " +
      hits.map((h) => h.red_flag).join(" "),
    signals,
    fired_rule_ids: ruleIds
  };
}

export function analyze(req: AnalyzeRequest): AnalyzeResponse {
  let signals = extract(req.text);
  signals = mergePriorSignals(signals, req.prior_signals);

  if (req.follow_up_answers) {
    for (const [id, ans] of Object.entries(req.follow_up_answers)) {
      signals = applyAnswer(signals, id, ans);
    }
  }

  const instantHits = evaluateInstantFail(signals);
  if (instantHits.length > 0) {
    return { kind: "verdict", verdict: buildInstantFailVerdict(signals, instantHits) };
  }

  const classification = classify(signals, req.category_hint);
  const verdict = evaluate(classification.category, signals);
  const followUpCount = req.follow_up_count ?? 0;

  const decisive =
    verdict.verdict === "likely_scam" ||
    (verdict.verdict === "probably_safe" && followUpCount >= 1) ||
    followUpCount >= MAX_FOLLOW_UPS;

  if (decisive) return { kind: "verdict", verdict };

  const askedIds = new Set(Object.keys(req.follow_up_answers ?? {}));
  const next = pickNextQuestion(classification.category, signals, askedIds);
  if (!next) return { kind: "verdict", verdict };

  return {
    kind: "follow_up",
    question: next.question,
    question_id: next.id,
    type: next.type,
    signals,
    category_guess: classification.category as Category
  };
}
