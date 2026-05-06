"use client";

import { useState } from "react";
import type { ScamLibraryCategory } from "@/lib/detection/patterns";
import { CheckAgent } from "./CheckAgent";
import { ScamLibrary } from "./ScamLibrary";

export function HomeLayout({ library }: { library: ScamLibraryCategory[] }) {
  const [mobileTab, setMobileTab] = useState<"check" | "library">("check");

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-10 pt-3 sm:pt-5">
      <header className="mb-6 flex items-end justify-between border-b border-rule pb-4">
        <div>
          <h1 className="serif text-2xl font-semibold leading-none text-ink sm:text-3xl">
            Scam Check
          </h1>
          <p className="serif mt-1 text-sm italic text-ink-soft">
            A second opinion before you pay.
          </p>
        </div>
        <div className="hidden text-right text-xs text-ink-soft sm:block">
          <p className="smallcaps">cyber helpline</p>
          <p className="serif text-lg font-semibold text-ink">1930</p>
        </div>
      </header>

      <div className="mb-4 flex gap-1.5 lg:hidden">
        <MobileTab
          active={mobileTab === "check"}
          onClick={() => setMobileTab("check")}
          label="Check your offer"
        />
        <MobileTab
          active={mobileTab === "library"}
          onClick={() => setMobileTab("library")}
          label="Common scams"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,400px)] lg:items-start">
        <section
          className={`border border-rule bg-paper shadow-[0_1px_0_rgba(0,0,0,0.02),0_8px_24px_-12px_rgba(46,32,16,0.08)] ${
            mobileTab === "library" ? "block" : "hidden"
          } lg:block lg:h-[calc(100vh-9rem)] lg:overflow-y-auto`}
        >
          <div className="p-5 sm:p-6">
            <ScamLibrary library={library} />
          </div>
        </section>

        <section
          className={`border border-rule bg-paper shadow-[0_1px_0_rgba(0,0,0,0.02),0_8px_24px_-12px_rgba(46,32,16,0.08)] ${
            mobileTab === "check" ? "block" : "hidden"
          } lg:sticky lg:top-6 lg:block lg:h-[calc(100vh-9rem)] lg:overflow-y-auto`}
        >
          <div className="p-5 sm:p-6">
            <CheckAgent />
          </div>
        </section>
      </div>

      <footer className="mt-12 border-t border-rule pt-6 text-xs text-ink-soft">
        <p className="serif italic">
          Cyber crime helpline <span className="not-italic font-semibold text-ink">1930</span> ·{" "}
          <a className="text-claret hover:underline" href="https://cybercrime.gov.in" target="_blank" rel="noreferrer">
            cybercrime.gov.in
          </a>{" "}
          · investment fraud:{" "}
          <a className="text-claret hover:underline" href="https://sachet.rbi.org.in" target="_blank" rel="noreferrer">
            sachet.rbi.org.in
          </a>
        </p>
      </footer>
    </div>
  );
}

function MobileTab({
  active,
  onClick,
  label
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 border px-3 py-2 text-sm transition ${
        active
          ? "border-claret bg-claret text-paper"
          : "border-rule bg-paper text-ink-soft hover:border-ink-soft"
      }`}
    >
      {label}
    </button>
  );
}
