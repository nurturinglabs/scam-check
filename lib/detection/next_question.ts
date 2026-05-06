import type { Category, Signals } from "./types";

export interface FollowUpQuestion {
  id: string;
  question: string;
  type: "yes_no" | "text";
  /** signal flipped to true if the user answers yes */
  resolves_signal: string;
  /** asked if this signal is currently false (we couldn't extract it) */
  applies_when_unset: string;
}

const QUESTIONS_BY_CATEGORY: Record<Category, FollowUpQuestion[]> = {
  job: [
    {
      id: "job_payment_asked",
      question:
        "Did they ask you to pay any money — registration, training, kit, security deposit — before joining?",
      type: "yes_no",
      resolves_signal: "payment_for_job_offer",
      applies_when_unset: "payment_for_job_offer"
    },
    {
      id: "job_unsolicited",
      question:
        "Did they reach out to you out of the blue, or did you apply to them first?",
      type: "yes_no",
      resolves_signal: "unsolicited_contact",
      applies_when_unset: "unsolicited_contact"
    },
    {
      id: "job_docs_requested",
      question: "Have they asked you to send Aadhaar, PAN, or bank details upfront?",
      type: "yes_no",
      resolves_signal: "personal_docs_requested",
      applies_when_unset: "personal_docs_requested"
    }
  ],
  investment: [
    {
      id: "inv_returns_promised",
      question:
        "Did they promise you a specific return on your money — like a percentage, daily/weekly profit, or 'doubling' your money?",
      type: "yes_no",
      resolves_signal: "guaranteed_high_returns",
      applies_when_unset: "guaranteed_high_returns"
    },
    {
      id: "inv_telegram_group",
      question: "Are they pushing you to a Telegram or WhatsApp 'signals' / VIP group?",
      type: "yes_no",
      resolves_signal: "telegram_only_contact",
      applies_when_unset: "telegram_only_contact"
    },
    {
      id: "inv_screenshots",
      question:
        "Have they shown you screenshots of profits / withdrawals or claimed they made big money quickly?",
      type: "yes_no",
      resolves_signal: "screenshots_of_profits",
      applies_when_unset: "screenshots_of_profits"
    }
  ],
  loan: [
    {
      id: "loan_fee_asked",
      question:
        "Have they asked you for any fee (GST, processing, insurance, refundable deposit) before releasing the loan?",
      type: "yes_no",
      resolves_signal: "loan_fee_before_disbursement",
      applies_when_unset: "loan_fee_before_disbursement"
    },
    {
      id: "loan_no_documents",
      question:
        "Are they offering the loan without checking your documents, salary, or CIBIL score?",
      type: "yes_no",
      resolves_signal: "loan_no_documents_required",
      applies_when_unset: "loan_no_documents_required"
    },
    {
      id: "loan_unsolicited",
      question: "Did they reach out to you, or did you apply for this loan first?",
      type: "yes_no",
      resolves_signal: "unsolicited_contact",
      applies_when_unset: "unsolicited_contact"
    }
  ],
  task: [
    {
      id: "task_pay_to_unlock",
      question:
        "Are they asking you to deposit, recharge, or top up money to 'unlock' bigger tasks or higher pay?",
      type: "yes_no",
      resolves_signal: "pay_to_unlock_earnings",
      applies_when_unset: "pay_to_unlock_earnings"
    },
    {
      id: "task_telegram_group",
      question: "Did they add you to a Telegram or WhatsApp group to give you tasks?",
      type: "yes_no",
      resolves_signal: "telegram_only_contact",
      applies_when_unset: "telegram_only_contact"
    },
    {
      id: "task_unsolicited",
      question: "Did they message you out of the blue?",
      type: "yes_no",
      resolves_signal: "unsolicited_contact",
      applies_when_unset: "unsolicited_contact"
    }
  ],
  courier: [
    {
      id: "courier_threat",
      question:
        "Did they mention police, CBI, customs, FIR, arrest, or any kind of legal action against you?",
      type: "yes_no",
      resolves_signal: "arrest_threat",
      applies_when_unset: "arrest_threat"
    },
    {
      id: "courier_release_fee",
      question:
        "Are they asking you to pay a fee to 'release' the parcel or clear customs?",
      type: "yes_no",
      resolves_signal: "customs_or_courier_pretext",
      applies_when_unset: "customs_or_courier_pretext"
    },
    {
      id: "courier_docs_requested",
      question: "Have they asked for your Aadhaar / PAN or bank details to verify?",
      type: "yes_no",
      resolves_signal: "personal_docs_requested",
      applies_when_unset: "personal_docs_requested"
    }
  ],
  unknown: [
    {
      id: "unknown_kind",
      question:
        "What is this offer about — a job, an investment, a loan, an online task / earning, or a courier / parcel call?",
      type: "text",
      resolves_signal: "category_hint",
      applies_when_unset: "category_hint"
    },
    {
      id: "unknown_money_asked",
      question: "Have they asked you to pay any amount, even a small one?",
      type: "yes_no",
      resolves_signal: "upfront_payment_demanded",
      applies_when_unset: "upfront_payment_demanded"
    },
    {
      id: "unknown_otp_or_docs",
      question: "Have they asked for an OTP, Aadhaar, PAN, bank details, or to install an app?",
      type: "yes_no",
      resolves_signal: "personal_docs_requested",
      applies_when_unset: "personal_docs_requested"
    }
  ]
};

export function pickNextQuestion(
  category: Category,
  signals: Signals,
  alreadyAsked: Set<string>
): FollowUpQuestion | null {
  const list = QUESTIONS_BY_CATEGORY[category] ?? QUESTIONS_BY_CATEGORY.unknown;
  for (const q of list) {
    if (alreadyAsked.has(q.id)) continue;
    const v = signals[q.applies_when_unset];
    if (v === true) continue;
    return q;
  }
  return null;
}

export function applyAnswer(
  signals: Signals,
  questionId: string,
  answer: string | boolean
): Signals {
  const all = Object.values(QUESTIONS_BY_CATEGORY).flat();
  const q = all.find((x) => x.id === questionId);
  if (!q) return signals;

  const yes =
    answer === true ||
    (typeof answer === "string" && /^(y|yes|haan|haa|ha|yep|yeah|sure)$/i.test(answer.trim()));

  const next: Signals = { ...signals };
  if (q.resolves_signal === "category_hint") {
    return next;
  }
  if (yes) {
    next[q.resolves_signal] = true;
    if (q.resolves_signal === "payment_for_job_offer") {
      next.upfront_payment_demanded = true;
      next.mentions_registration_fee = true;
    }
    if (q.resolves_signal === "loan_fee_before_disbursement") {
      next.upfront_payment_demanded = true;
    }
    if (q.resolves_signal === "pay_to_unlock_earnings") {
      next.mentions_recharge_or_topup = true;
    }
    if (q.resolves_signal === "customs_or_courier_pretext") {
      next.mentions_courier_or_customs_fee = true;
      next.upfront_payment_demanded = true;
    }
    if (q.resolves_signal === "arrest_threat") {
      next.threat_or_arrest_language = true;
    }
  }
  return next;
}
