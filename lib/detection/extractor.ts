import { loadPatterns } from "./patterns";
import type { Signals } from "./types";

const PAYMENT_FEE_SIGNALS = [
  "mentions_registration_fee",
  "mentions_security_deposit",
  "mentions_training_fee",
  "mentions_gst_or_tax_fee",
  "mentions_processing_fee",
  "mentions_refundable_deposit",
  "mentions_recharge_or_topup",
  "mentions_courier_or_customs_fee"
];

function extractPaymentAmount(text: string): number | null {
  let max = 0;
  let found = false;

  const amountRegex =
    /(?:₹|rs\.?|inr|rupees?)\s*([0-9][0-9,]*)(?:\s*(k|lakh|lac|cr|crore))?|([0-9][0-9,]*)\s*(?:rs\.?|inr|rupees?|₹)|([0-9][0-9,]*)\s*(k|lakh|lac|cr|crore)\b/gi;

  let m: RegExpExecArray | null;
  while ((m = amountRegex.exec(text)) !== null) {
    const raw = m[1] ?? m[3] ?? m[4];
    const unit = (m[2] ?? m[5] ?? "").toLowerCase();
    if (!raw) continue;
    const n = parseInt(raw.replace(/,/g, ""), 10);
    if (Number.isNaN(n)) continue;
    let value = n;
    if (unit === "k") value = n * 1000;
    else if (unit === "lakh" || unit === "lac") value = n * 100000;
    else if (unit === "cr" || unit === "crore") value = n * 10000000;
    if (value > max) max = value;
    found = true;
  }

  return found ? max : null;
}

function detectUnrealisticPayForEffort(text: string): boolean {
  const lower = text.toLowerCase();
  const hourMatch = /\b(\d{1,2})\s*(?:-\s*\d{1,2}\s*)?(?:hr|hrs|hour|hours)\s*\/?\s*day\b/.exec(
    lower
  );
  const monthlyKMatch = /\b(\d{1,3})\s*k\s*(?:\/?\s*month|per\s+month|\/?\s*mo\b)/.exec(lower);
  const dailyMatch = /\b(\d{3,5})\s*(?:rs|rupees|₹)?\s*(?:\/?\s*day|per\s+day|daily)\b/.exec(lower);

  if (hourMatch && monthlyKMatch) {
    const hoursPerDay = parseInt(hourMatch[1], 10);
    const monthlyK = parseInt(monthlyKMatch[1], 10);
    if (hoursPerDay <= 4 && monthlyK >= 10) return true;
  }
  if (hourMatch && dailyMatch) {
    const hoursPerDay = parseInt(hourMatch[1], 10);
    const daily = parseInt(dailyMatch[1], 10);
    if (hoursPerDay <= 3 && daily >= 500) return true;
  }
  // High monthly pay for unspecified work (50K+ per month is suspicious for casual job pitches)
  const highMonthly = /\b(\d{2,3})\s*[k]?\s*(?:\/?\s*month|per\s+month)/.exec(lower);
  if (highMonthly) {
    const raw = parseInt(highMonthly[1], 10);
    const isK = /\bk\s*(?:\/?\s*month|per\s+month)/.test(lower);
    const monthlyValue = isK ? raw * 1000 : raw * 1000;
    if (monthlyValue >= 40000) return true;
  }
  return false;
}

export function extract(text: string): Signals {
  const { signalPatterns, knownSignals } = loadPatterns();
  const signals: Record<string, boolean | number | null> = {};

  for (const s of knownSignals) signals[s] = false;

  for (const { signal, regex } of signalPatterns) {
    if (signals[signal]) continue;
    if (regex.test(text)) signals[signal] = true;
  }

  signals.payment_amount = extractPaymentAmount(text);
  signals.unrealistic_pay_for_effort = detectUnrealisticPayForEffort(text);
  signals.unrealistic_pay_ratio = signals.unrealistic_pay_for_effort;

  signals.upfront_payment_demanded = PAYMENT_FEE_SIGNALS.some((s) => signals[s] === true);

  // Derived compound signals named in the PRD
  signals.payment_for_job_offer =
    signals.mentions_registration_fee === true ||
    signals.mentions_training_fee === true ||
    signals.mentions_security_deposit === true ||
    signals.mentions_refundable_deposit === true;

  signals.pay_to_unlock_earnings =
    signals.merchant_task_unlock === true || signals.mentions_recharge_or_topup === true;

  signals.customs_or_courier_pretext =
    signals.parcel_held_by_customs === true || signals.mentions_courier_or_customs_fee === true;

  signals.arrest_threat =
    signals.threat_or_arrest_language === true ||
    signals.digital_arrest_or_police_call === true;

  signals.loan_fee_before_disbursement =
    signals.loan_pre_approved_unprompted === true &&
    (signals.upfront_payment_demanded === true ||
      signals.mentions_processing_fee === true ||
      signals.mentions_gst_or_tax_fee === true ||
      signals.mentions_refundable_deposit === true);

  return signals as Signals;
}
