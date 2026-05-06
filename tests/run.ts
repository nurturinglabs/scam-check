import fixtures from "./fixtures.json";
import { extract } from "../lib/detection/extractor";
import { evaluateInstantFail } from "../lib/detection/instant_fail";
import { classify } from "../lib/detection/classifier";
import { evaluate } from "../lib/detection/rules";
import type { Category } from "../lib/detection/types";

interface Fixture {
  id: string;
  text: string;
  expected_category: string;
  expected_verdict: string;
  expected_severity?: string;
  expected_instant_fail?: boolean;
  expected_red_flags_must_include: string[];
}

const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const RESET = "\x1b[0m";
const DIM = "\x1b[2m";

let pass = 0;
let fail = 0;
const failures: string[] = [];

for (const fx of fixtures.fixtures as Fixture[]) {
  const signals = extract(fx.text);
  const instant = evaluateInstantFail(signals);
  const isInstant = instant.length > 0;
  const cls = classify(signals);

  let category: Category;
  let verdict: string;
  let severity: string;
  let firedIds: string[];

  if (isInstant) {
    category = instant[0].category;
    verdict = "likely_scam";
    severity = "high";
    const ruleVerdict = evaluate(category, signals);
    firedIds = [
      ...instant.map((h) => h.rule_id),
      ...ruleVerdict.fired_rule_ids
    ];
  } else {
    const ruleVerdict = evaluate(cls.category, signals);
    category = cls.category;
    verdict = ruleVerdict.verdict;
    severity = ruleVerdict.severity;
    firedIds = ruleVerdict.fired_rule_ids;
  }

  const errors: string[] = [];
  if (category !== fx.expected_category) {
    errors.push(
      `category: expected ${fx.expected_category}, got ${category} (scores=${JSON.stringify(cls.scores)})`
    );
  }
  if (verdict !== fx.expected_verdict) {
    errors.push(`verdict: expected ${fx.expected_verdict}, got ${verdict}`);
  }
  if (fx.expected_severity && severity !== fx.expected_severity) {
    errors.push(`severity: expected ${fx.expected_severity}, got ${severity}`);
  }
  if (typeof fx.expected_instant_fail === "boolean" && fx.expected_instant_fail !== isInstant) {
    errors.push(
      `instant_fail: expected ${fx.expected_instant_fail}, got ${isInstant} (hits=${instant.map((h) => h.rule_id).join(",") || "none"})`
    );
  }
  for (const ruleId of fx.expected_red_flags_must_include) {
    if (!firedIds.includes(ruleId)) {
      errors.push(`missing red flag rule: ${ruleId} (fired=${firedIds.join(",") || "none"})`);
    }
  }

  if (errors.length === 0) {
    pass++;
    console.log(`${GREEN}PASS${RESET} ${fx.id}`);
  } else {
    fail++;
    console.log(`${RED}FAIL${RESET} ${fx.id}`);
    for (const e of errors) console.log(`  ${YELLOW}-${RESET} ${e}`);
    console.log(`  ${DIM}text: ${fx.text}${RESET}`);
    console.log(
      `  ${DIM}signals on: ${Object.entries(signals)
        .filter(([, v]) => v === true || (typeof v === "number" && v > 0))
        .map(([k, v]) => `${k}=${v}`)
        .join(", ")}${RESET}`
    );
    failures.push(fx.id);
  }
}

console.log("");
console.log(`${pass} passed, ${fail} failed (${pass + fail} total)`);
if (fail > 0) {
  console.log(`Failures: ${failures.join(", ")}`);
  process.exit(1);
}
