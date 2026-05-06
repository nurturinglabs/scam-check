import common from "@/data/patterns/common.json";
import job from "@/data/patterns/job.json";
import investment from "@/data/patterns/investment.json";
import loan from "@/data/patterns/loan.json";
import task from "@/data/patterns/task.json";
import courier from "@/data/patterns/courier.json";
import type { Category, CategoryDisplay, PatternFile, RedFlagRule, ScamCardEntry } from "./types";

export type { ScamCardEntry } from "./types";

const FILES: Record<string, PatternFile> = {
  common: common as PatternFile,
  job: job as PatternFile,
  investment: investment as PatternFile,
  loan: loan as PatternFile,
  task: task as PatternFile,
  courier: courier as PatternFile
};

export const CATEGORIES: Category[] = ["job", "investment", "loan", "task", "courier"];

export const CATEGORY_LABEL: Record<Category, string> = {
  job: "Job offer",
  investment: "Investment / trading",
  loan: "Loan offer",
  task: "Task / part-time work",
  courier: "Courier / parcel / police call",
  unknown: "Unknown"
};

export interface CompiledSignalPattern {
  signal: string;
  regex: RegExp;
}

export interface CompiledPatterns {
  signalPatterns: CompiledSignalPattern[];
  rulesByCategory: Record<Category, RedFlagRule[]>;
  weightsByCategory: Record<Category, Record<string, number>>;
  nextStepsByCategory: Record<Category, string[]>;
  commonNextSteps: string[];
  commonRules: RedFlagRule[];
  knownSignals: Set<string>;
}

let cached: CompiledPatterns | null = null;

export function loadPatterns(): CompiledPatterns {
  if (cached) return cached;

  const signalPatterns: CompiledSignalPattern[] = [];
  const knownSignals = new Set<string>();

  for (const file of Object.values(FILES)) {
    if (!file.signal_patterns) continue;
    for (const [signal, patterns] of Object.entries(file.signal_patterns)) {
      knownSignals.add(signal);
      for (const p of patterns) {
        signalPatterns.push({ signal, regex: new RegExp(p, "i") });
      }
    }
  }

  const commonRules = (FILES.common.red_flag_rules ?? []) as RedFlagRule[];

  const rulesByCategory: Record<Category, RedFlagRule[]> = {
    job: (FILES.job.red_flag_rules ?? []) as RedFlagRule[],
    investment: (FILES.investment.red_flag_rules ?? []) as RedFlagRule[],
    loan: (FILES.loan.red_flag_rules ?? []) as RedFlagRule[],
    task: (FILES.task.red_flag_rules ?? []) as RedFlagRule[],
    courier: (FILES.courier.red_flag_rules ?? []) as RedFlagRule[],
    unknown: []
  };

  const weightsByCategory: Record<Category, Record<string, number>> = {
    job: FILES.job.category_signal_weights ?? {},
    investment: FILES.investment.category_signal_weights ?? {},
    loan: FILES.loan.category_signal_weights ?? {},
    task: FILES.task.category_signal_weights ?? {},
    courier: FILES.courier.category_signal_weights ?? {},
    unknown: {}
  };

  const nextStepsByCategory: Record<Category, string[]> = {
    job: FILES.job.next_steps ?? [],
    investment: FILES.investment.next_steps ?? [],
    loan: FILES.loan.next_steps ?? [],
    task: FILES.task.next_steps ?? [],
    courier: FILES.courier.next_steps ?? [],
    unknown: []
  };

  const commonNextSteps = FILES.common.common_next_steps ?? [];

  cached = {
    signalPatterns,
    rulesByCategory,
    weightsByCategory,
    nextStepsByCategory,
    commonNextSteps,
    commonRules,
    knownSignals
  };
  return cached;
}

export interface ScamLibraryCategory extends CategoryDisplay {
  category: Category;
}

export function loadScamLibrary(): ScamLibraryCategory[] {
  const out: ScamLibraryCategory[] = [];
  for (const cat of CATEGORIES) {
    const file = FILES[cat];
    if (!file?.display) continue;
    out.push({ category: cat, ...file.display });
  }
  return out;
}
