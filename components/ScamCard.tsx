import type { ScamCardEntry } from "@/lib/detection/patterns";

const PREVALENCE_BADGE: Record<string, string> = {
  high: "border-claret/40 text-claret",
  medium: "border-mustard/50 text-mustard",
  low: "border-rule text-ink-soft"
};

const PREVALENCE_LABEL: Record<string, string> = {
  high: "Common",
  medium: "Seen often",
  low: "Less common"
};

export function ScamCard({ card, color }: { card: ScamCardEntry; color: string }) {
  return (
    <article
      className="border border-rule bg-paper p-5 transition hover:border-ink-soft"
      style={{ borderLeft: `3px solid ${color}` }}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="serif text-base font-semibold leading-snug text-ink">
          {card.title}
        </h3>
        <span
          className={`smallcaps shrink-0 border px-2 py-0.5 text-[10px] font-medium ${PREVALENCE_BADGE[card.prevalence] ?? PREVALENCE_BADGE.low}`}
        >
          {PREVALENCE_LABEL[card.prevalence] ?? card.prevalence}
        </span>
      </div>

      <p className="mt-2.5 text-sm leading-relaxed text-ink-soft">{card.script}</p>

      <blockquote className="serif mt-3 border-l-2 border-rule pl-3 text-[13px] italic leading-relaxed text-ink-soft">
        “{card.example}”
      </blockquote>

      {card.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {card.tags.map((t) => (
            <span
              key={t}
              className="smallcaps border border-rule px-2 py-0.5 text-[10px] font-medium text-ink-soft"
            >
              {t}
            </span>
          ))}
        </div>
      )}
    </article>
  );
}
