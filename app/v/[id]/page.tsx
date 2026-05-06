import Link from "next/link";
import { notFound } from "next/navigation";
import { Verdict } from "@/components/Verdict";
import { CATEGORY_LABEL } from "@/lib/detection/patterns";
import { getStorage } from "@/lib/storage";
import type { Category } from "@/lib/detection/types";

export const dynamic = "force-dynamic";

export default async function SharePage({ params }: { params: { id: string } }) {
  const id = params.id;
  if (!/^[a-z0-9]{4,12}$/i.test(id)) notFound();

  const v = await getStorage().getVerdict(id);
  if (!v) notFound();

  const cat = (v.category as Category) ?? "unknown";

  return (
    <main className="mx-auto min-h-screen w-full max-w-xl px-4 pb-12 pt-3 sm:pt-5">
      <header className="mb-6 flex items-end justify-between border-b border-rule pb-4">
        <Link href="/" className="block">
          <h1 className="serif text-2xl font-semibold text-ink">Scam Check</h1>
        </Link>
        <span className="smallcaps text-[11px] text-ink-soft">shared verdict</span>
      </header>

      <Verdict
        verdict={{
          category: v.category,
          category_label: CATEGORY_LABEL[cat] ?? "Verdict",
          verdict: v.verdict,
          severity: v.severity,
          red_flags: v.red_flags,
          next_steps: v.next_steps,
          reasoning: v.reasoning
        }}
      />

      <div className="mt-8 border border-rule bg-paper p-5 text-center">
        <p className="serif italic text-sm text-ink-soft">Got a suspicious offer of your own?</p>
        <Link
          href="/"
          className="smallcaps mt-3 inline-block border border-claret bg-claret px-5 py-2.5 text-sm font-semibold tracking-[0.2em] text-paper transition hover:bg-claret-deep"
        >
          Check your own offer
        </Link>
      </div>

      <footer className="mt-12 border-t border-rule pt-6 text-xs text-ink-soft">
        <p className="serif italic">
          Cyber crime helpline <span className="not-italic font-semibold text-ink">1930</span> ·{" "}
          <a className="text-claret hover:underline" href="https://cybercrime.gov.in" target="_blank" rel="noreferrer">
            cybercrime.gov.in
          </a>
        </p>
      </footer>
    </main>
  );
}
