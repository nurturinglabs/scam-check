import type { Category, Signals } from "./types";

export interface InstantFailHit {
  rule_id: string;
  category: Category;
  red_flag: string;
}

const RULES: Array<{
  id: string;
  category: Category;
  fires: (s: Signals) => boolean;
  red_flag: string;
}> = [
  {
    id: "instant_guaranteed_high_returns",
    category: "investment",
    fires: (s) => s.guaranteed_high_returns === true,
    red_flag:
      "They are promising guaranteed / fixed / specific-percentage returns. SEBI bars Indian investment advisors from guaranteeing returns. Anyone who does — even one calling themselves 'SEBI registered' — is operating illegally. This is the single strongest scam signal we look for."
  },
  {
    id: "instant_arrest_threat",
    category: "courier",
    fires: (s) => s.arrest_threat === true,
    red_flag:
      "They are threatening arrest / FIR / digital arrest / CBI / police action. There is no such thing as 'digital arrest' in Indian law. Real police never demand money or hold you on phone or video calls. Hang up immediately."
  },
  {
    id: "instant_loan_fee_before_disbursement",
    category: "loan",
    fires: (s) => s.loan_fee_before_disbursement === true,
    red_flag:
      "They want a fee (GST / processing / insurance / refundable deposit) BEFORE the loan is disbursed. RBI rules forbid this — regulated lenders deduct fees from the disbursement, never collect upfront."
  },
  {
    id: "instant_pay_to_unlock_earnings",
    category: "task",
    fires: (s) => s.pay_to_unlock_earnings === true,
    red_flag:
      "They want YOU to deposit / recharge money to 'unlock' bigger tasks or higher payouts. This is the classic merchant-task scam — early payouts are bait, your deposit is never returned."
  },
  {
    id: "instant_payment_for_unsolicited_job",
    category: "job",
    fires: (s) => s.payment_for_job_offer === true && s.unsolicited_contact === true,
    red_flag:
      "An unsolicited 'job offer' that asks for any payment (registration, training, security deposit, kit fee) is a scam. Genuine employers never ask candidates to pay, and Indian law forbids it under the Employment Exchanges Act."
  },
  {
    id: "instant_crypto_or_trading_pump_via_telegram",
    category: "investment",
    fires: (s) =>
      (s.crypto_or_trading_app_mentioned === true ||
        s.stock_or_ipo_tip === true ||
        s.pump_signals_group === true ||
        s.screenshots_of_profits === true) &&
      (s.telegram_only_contact === true || s.whatsapp_only_contact === true),
    red_flag:
      "Crypto / forex / stock 'tip' or 'signals' delivered via Telegram or WhatsApp is the classic pump-and-dump or task-trading scam. Early withdrawals work, then you can't withdraw and they ask for tax/GST to release funds."
  }
];

export function evaluateInstantFail(signals: Signals): InstantFailHit[] {
  const hits: InstantFailHit[] = [];
  for (const r of RULES) {
    if (r.fires(signals)) {
      hits.push({ rule_id: r.id, category: r.category, red_flag: r.red_flag });
    }
  }
  return hits;
}
