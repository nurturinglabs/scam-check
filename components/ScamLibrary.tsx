"use client";

import { useMemo, useState } from "react";
import type { ScamLibraryCategory } from "@/lib/detection/patterns";
import { ScamCard } from "./ScamCard";

interface Props {
  library: ScamLibraryCategory[];
}

export function ScamLibrary({ library }: Props) {
  const [filter, setFilter] = useState<string | "all">("all");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return library
      .filter((cat) => filter === "all" || cat.category === filter)
      .map((cat) => ({
        ...cat,
        cards: cat.cards.filter((c) => {
          if (!q) return true;
          return (
            c.title.toLowerCase().includes(q) ||
            c.script.toLowerCase().includes(q) ||
            c.example.toLowerCase().includes(q) ||
            c.tags.some((t) => t.toLowerCase().includes(q))
          );
        })
      }))
      .filter((cat) => cat.cards.length > 0);
  }, [library, filter, query]);

  const totalShown = filtered.reduce((n, c) => n + c.cards.length, 0);

  return (
    <div>
      <div className="sticky top-0 z-20 -mx-5 -mt-5 space-y-3 border-b border-rule bg-paper/95 px-5 pb-4 pt-5 backdrop-blur sm:-mx-6 sm:-mt-6 sm:px-6 sm:pt-6">
        <div>
          <p className="smallcaps text-[11px] font-medium text-claret">the index</p>
          <h2 className="serif mt-0.5 text-xl font-semibold text-ink">
            Common scams in circulation
          </h2>
          <p className="serif mt-1 text-[13px] italic text-ink-soft">
            Recognize the script before they pressure you. {totalShown} pattern{totalShown === 1 ? "" : "s"} listed.
          </p>
        </div>

        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search patterns (e.g. registration fee, telegram)"
          className="block w-full border border-rule bg-paper px-3 py-2 text-sm text-ink placeholder:text-ink-soft/70 focus:border-claret focus:outline-none focus:ring-1 focus:ring-claret"
        />

        <div className="flex flex-wrap gap-1.5">
          <Chip active={filter === "all"} onClick={() => setFilter("all")} label="All" />
          {library.map((cat) => (
            <Chip
              key={cat.category}
              active={filter === cat.category}
              onClick={() => setFilter(cat.category)}
              label={cat.label}
              color={cat.color}
            />
          ))}
        </div>
      </div>

      <div className="space-y-7 pt-5">
        {filtered.length === 0 && (
          <p className="serif italic text-sm text-ink-soft">No patterns match your search.</p>
        )}
        {filtered.map((cat) => (
          <section key={cat.category}>
            <div
              className="sticky top-[10rem] z-10 -mx-1 mb-3 border-b border-rule bg-paper/95 px-1 py-1 backdrop-blur"
              style={{ borderLeftColor: cat.color, borderLeftWidth: 3 }}
            >
              <h3 className="smallcaps pl-2 text-[11px] font-semibold tracking-[0.2em] text-ink">
                {cat.label}
              </h3>
            </div>
            <div className="space-y-3">
              {cat.cards.map((c) => (
                <ScamCard key={c.id} card={c} color={cat.color} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function Chip({
  active,
  onClick,
  label,
  color
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  color?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`border px-3 py-1 text-xs font-medium tracking-wide transition ${
        active
          ? "border-claret bg-claret text-paper"
          : "border-rule bg-paper text-ink-soft hover:border-ink-soft"
      }`}
      style={!active && color ? { borderLeftColor: color, borderLeftWidth: 3 } : undefined}
    >
      {label}
    </button>
  );
}
