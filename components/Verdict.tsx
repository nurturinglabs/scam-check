"use client";

import { useState } from "react";

export interface VerdictData {
  category?: string;
  category_label?: string;
  verdict: string;
  severity: string;
  red_flags: string[];
  next_steps: string[];
  reasoning?: string;
}

const HEADLINES: Record<string, string> = {
  likely_scam: "Likely a scam — do not pay.",
  need_more_info: "Suspicious — be very careful.",
  probably_safe: "No clear scam signals found."
};

const KICKER: Record<string, string> = {
  likely_scam: "the verdict",
  need_more_info: "proceed with care",
  probably_safe: "appears clean"
};

const BANNER_CLASSES: Record<string, string> = {
  likely_scam: "bg-claret text-paper border-claret-deep",
  need_more_info: "bg-mustard text-paper border-mustard",
  probably_safe: "bg-moss text-paper border-moss"
};

export function Verdict({
  verdict,
  shareUrl,
  onCheckAnother
}: {
  verdict: VerdictData;
  shareUrl?: string;
  onCheckAnother?: () => void;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  return (
    <section className="space-y-4">
      <div
        className={`border-l-[5px] px-5 py-5 ${
          BANNER_CLASSES[verdict.verdict] ?? "bg-ink text-paper border-ink"
        }`}
      >
        <p className="smallcaps text-[11px] font-medium opacity-80">
          {KICKER[verdict.verdict] ?? "verdict"} · {verdict.category_label ?? ""}
        </p>
        <h2 className="serif mt-1 text-2xl font-semibold leading-tight sm:text-[26px]">
          {HEADLINES[verdict.verdict] ?? "Verdict"}
        </h2>
      </div>

      {verdict.red_flags.length > 0 && (
        <div className="border border-rule bg-paper p-5">
          <p className="smallcaps text-[11px] font-medium text-claret">why we think so</p>
          <ul className="mt-3 space-y-3 text-[14px] leading-relaxed text-ink">
            {verdict.red_flags.map((rf, i) => (
              <li key={i} className="flex gap-3">
                <span className="serif mt-0.5 shrink-0 text-claret font-semibold">§{i + 1}</span>
                <span>{rf}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="border border-rule bg-paper p-5">
        <p className="smallcaps text-[11px] font-medium text-moss">what to do next</p>
        <ul className="mt-3 space-y-2.5 text-[14px] leading-relaxed text-ink">
          {verdict.next_steps.map((s, i) => (
            <li key={i} className="flex gap-3">
              <span className="serif mt-0.5 shrink-0 text-moss font-semibold">{i + 1}.</span>
              <span>{s}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        {shareUrl && (
          <button
            type="button"
            onClick={copy}
            className="smallcaps flex-1 border border-claret bg-claret px-4 py-3 text-sm font-semibold tracking-[0.2em] text-paper transition hover:bg-claret-deep"
          >
            {copied ? "Copied" : "Share this verdict"}
          </button>
        )}
        {onCheckAnother && (
          <button
            type="button"
            onClick={onCheckAnother}
            className="smallcaps flex-1 border border-rule bg-paper px-4 py-3 text-sm font-semibold tracking-[0.2em] text-ink transition hover:border-ink-soft"
          >
            Check another
          </button>
        )}
      </div>
    </section>
  );
}
