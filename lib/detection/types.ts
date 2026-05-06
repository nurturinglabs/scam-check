export type Category = "job" | "investment" | "loan" | "task" | "courier" | "unknown";

export type Severity = "low" | "medium" | "high";

export type Verdict = "likely_scam" | "probably_safe" | "need_more_info";

export type Signals = {
  [key: string]: boolean | number | null;
} & {
  payment_amount: number | null;
  upfront_payment_demanded: boolean;
  unrealistic_pay_for_effort: boolean;
};

export interface RedFlagRule {
  id: string;
  requires_all?: string[];
  requires_any?: string[];
  red_flag: string;
  severity: Severity;
}

export interface ScamCardEntry {
  id: string;
  title: string;
  script: string;
  tags: string[];
  example: string;
  prevalence: "low" | "medium" | "high";
}

export interface CategoryDisplay {
  label: string;
  icon: string;
  color: string;
  cards: ScamCardEntry[];
}

export interface PatternFile {
  metadata: { category: string; version: number; last_updated: string };
  signal_patterns?: Record<string, string[]>;
  category_signal_weights?: Record<string, number>;
  red_flag_rules?: RedFlagRule[];
  next_steps?: string[];
  common_next_steps?: string[];
  display?: CategoryDisplay;
}

export interface FinalVerdict {
  category: Category;
  category_label: string;
  verdict: Verdict;
  severity: Severity;
  red_flags: string[];
  next_steps: string[];
  reasoning: string;
  signals: Signals;
  fired_rule_ids: string[];
}

export interface AnalyzeRequest {
  text: string;
  category_hint?: Category;
  prior_signals?: Signals | null;
  follow_up_count?: number;
  follow_up_answers?: Record<string, string | boolean>;
}

export type AnalyzeResponse =
  | { kind: "verdict"; verdict: FinalVerdict }
  | {
      kind: "follow_up";
      question: string;
      question_id: string;
      type: "yes_no" | "text";
      signals: Signals;
      category_guess: Category;
    };
