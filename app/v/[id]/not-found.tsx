import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col items-center justify-center px-4 py-12 text-center">
      <p className="smallcaps text-[11px] font-medium text-claret">404 · no record</p>
      <h1 className="serif mt-2 text-2xl font-semibold text-ink">Verdict not found</h1>
      <p className="serif mt-2 text-sm italic text-ink-soft">
        This share link is invalid or has expired.
      </p>
      <Link
        href="/"
        className="smallcaps mt-6 inline-block border border-claret bg-claret px-5 py-2.5 text-sm font-semibold tracking-[0.2em] text-paper transition hover:bg-claret-deep"
      >
        Check an offer
      </Link>
    </main>
  );
}
