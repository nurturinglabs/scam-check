"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Verdict, type VerdictData } from "./Verdict";

type Category = "job" | "investment" | "loan" | "task" | "courier" | "other";

type ChatNode =
  | { kind: "user"; text: string }
  | { kind: "bot"; text: string }
  | { kind: "verdict"; data: VerdictData; shareUrl?: string };

interface FollowUp {
  question: string;
  question_id: string;
  type: "yes_no" | "text";
}

const CATEGORIES: { id: Category; label: string }[] = [
  { id: "job", label: "Job" },
  { id: "investment", label: "Investment" },
  { id: "loan", label: "Loan" },
  { id: "task", label: "Task" },
  { id: "courier", label: "Courier" },
  { id: "other", label: "Other" }
];

function getOrCreateSessionId(): string {
  if (typeof document === "undefined") return "";
  const m = document.cookie.match(/(?:^|;\s*)sc_sid=([^;]+)/);
  if (m) return decodeURIComponent(m[1]);
  const id = crypto.randomUUID();
  document.cookie = `sc_sid=${encodeURIComponent(id)}; path=/; max-age=${60 * 60 * 24 * 90}; SameSite=Lax`;
  return id;
}

export function CheckAgent() {
  const [text, setText] = useState("");
  const [category, setCategory] = useState<Category | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [chat, setChat] = useState<ChatNode[]>([]);
  const [followUp, setFollowUp] = useState<FollowUp | null>(null);
  const [followUpAnswers, setFollowUpAnswers] = useState<Record<string, boolean | string>>({});
  const [followUpCount, setFollowUpCount] = useState(0);
  const [priorSignals, setPriorSignals] = useState<Record<string, unknown> | null>(null);

  const [sessionId, setSessionId] = useState<string>("");
  const [originalText, setOriginalText] = useState<string>("");

  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSessionId(getOrCreateSessionId());
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [chat, followUp]);

  const canSubmit = useMemo(() => text.trim().length >= 5 && !submitting, [text, submitting]);

  async function persistVerdict(v: VerdictData & { signals?: unknown }, original: string) {
    try {
      const res = await fetch("/api/verdict", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          verdict: v,
          session_id: sessionId,
          user_text: original
        })
      });
      if (!res.ok) return undefined;
      const data = (await res.json()) as { id: string };
      return `${window.location.origin}/v/${data.id}`;
    } catch {
      return undefined;
    }
  }

  async function callAnalyze(payload: Record<string, unknown>) {
    const res = await fetch("/api/analyze", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      throw new Error(j.error ?? "request_failed");
    }
    return res.json();
  }

  async function handleAnalyzeResult(data: { kind: string } & Record<string, unknown>, original: string) {
    if (data.kind === "verdict") {
      const v = data.verdict as VerdictData;
      const url = await persistVerdict(v, original);
      setChat((prev) => [...prev, { kind: "verdict", data: v, shareUrl: url }]);
      setFollowUp(null);
    } else {
      const fu = {
        question: data.question as string,
        question_id: data.question_id as string,
        type: data.type as "yes_no" | "text"
      };
      setChat((prev) => [...prev, { kind: "bot", text: fu.question }]);
      setFollowUp(fu);
      setPriorSignals(data.signals as Record<string, unknown>);
    }
  }

  async function submitInitial() {
    setError(null);
    setSubmitting(true);
    const trimmed = text.trim();
    setOriginalText(trimmed);
    setChat([{ kind: "user", text: trimmed }]);
    try {
      const data = await callAnalyze({
        text: trimmed,
        category_hint: category && category !== "other" ? category : undefined,
        follow_up_count: 0
      });
      await handleAnalyzeResult(data, trimmed);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  async function answerFollowUp(answer: boolean | string) {
    if (!followUp) return;
    setError(null);
    setSubmitting(true);
    const userText = typeof answer === "boolean" ? (answer ? "Yes" : "No") : String(answer);
    setChat((prev) => [...prev, { kind: "user", text: userText }]);
    const newAnswers = { ...followUpAnswers, [followUp.question_id]: answer };
    setFollowUpAnswers(newAnswers);
    const newCount = followUpCount + 1;
    setFollowUpCount(newCount);
    setFollowUp(null);
    try {
      const data = await callAnalyze({
        text: originalText,
        category_hint: category && category !== "other" ? category : undefined,
        prior_signals: priorSignals,
        follow_up_count: newCount,
        follow_up_answers: newAnswers
      });
      await handleAnalyzeResult(data, originalText);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  function reset() {
    setText("");
    setCategory(null);
    setChat([]);
    setFollowUp(null);
    setFollowUpAnswers({});
    setFollowUpCount(0);
    setPriorSignals(null);
    setOriginalText("");
    setError(null);
  }

  const hasConversation = chat.length > 0;

  return (
    <div>
      <div className="sticky top-0 z-20 -mx-5 -mt-5 border-b border-rule bg-paper/95 px-5 pb-4 pt-5 backdrop-blur sm:-mx-6 sm:-mt-6 sm:px-6 sm:pt-6">
        <p className="smallcaps text-[11px] font-medium text-claret">the desk</p>
        <h2 className="serif mt-0.5 text-xl font-semibold text-ink">
          Got a suspicious offer? Check it here.
        </h2>
        <p className="serif mt-1 text-[13px] italic text-ink-soft">
          Paste the message or describe the call. A verdict in seconds.
        </p>
      </div>

      <div className="space-y-4 pt-5">
        {!hasConversation && (
          <InitialForm
            text={text}
            setText={setText}
            category={category}
            setCategory={setCategory}
            onSubmit={submitInitial}
            canSubmit={canSubmit}
            submitting={submitting}
          />
        )}

        {chat.map((node, i) => {
          if (node.kind === "user") {
            return (
              <div key={i} className="flex justify-end">
                <div className="max-w-[85%] whitespace-pre-wrap border border-claret bg-claret px-4 py-2.5 text-sm text-paper">
                  {node.text}
                </div>
              </div>
            );
          }
          if (node.kind === "bot") {
            return (
              <div key={i} className="flex">
                <div className="serif max-w-[85%] border-l-2 border-claret bg-parchment px-4 py-2.5 text-[15px] italic leading-relaxed text-ink">
                  {node.text}
                </div>
              </div>
            );
          }
          return (
            <div key={i}>
              <Verdict
                verdict={node.data}
                shareUrl={node.shareUrl}
                onCheckAnother={i === chat.length - 1 ? reset : undefined}
              />
            </div>
          );
        })}

        {followUp && (
          <FollowUpControls
            type={followUp.type}
            disabled={submitting}
            onAnswer={answerFollowUp}
          />
        )}

        {error && <p className="serif text-sm italic text-claret">{error}</p>}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

function InitialForm({
  text,
  setText,
  category,
  setCategory,
  onSubmit,
  canSubmit,
  submitting
}: {
  text: string;
  setText: (s: string) => void;
  category: Category | null;
  setCategory: (c: Category | null) => void;
  onSubmit: () => void;
  canSubmit: boolean;
  submitting: boolean;
}) {
  return (
    <div className="space-y-4">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Paste the message you received, or describe what they offered."
        rows={5}
        className="serif block w-full border border-rule bg-paper p-4 text-[15px] leading-relaxed text-ink placeholder:italic placeholder:text-ink-soft/70 focus:border-claret focus:outline-none focus:ring-1 focus:ring-claret"
      />

      <div>
        <p className="smallcaps text-[11px] font-medium text-claret">
          What kind of offer? (optional)
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {CATEGORIES.map((c) => {
            const active = category === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategory(active ? null : c.id)}
                className={`border px-3 py-1 text-xs font-medium tracking-wide transition ${
                  active
                    ? "border-claret bg-claret text-paper"
                    : "border-rule bg-paper text-ink-soft hover:border-ink-soft"
                }`}
              >
                {c.label}
              </button>
            );
          })}
        </div>
      </div>

      <button
        type="button"
        onClick={onSubmit}
        disabled={!canSubmit}
        className="smallcaps w-full border border-claret bg-claret px-4 py-3.5 text-sm font-semibold tracking-[0.2em] text-paper transition hover:bg-claret-deep hover:border-claret-deep disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? "Checking…" : "Check this offer"}
      </button>
    </div>
  );
}

function FollowUpControls({
  type,
  disabled,
  onAnswer
}: {
  type: "yes_no" | "text";
  disabled: boolean;
  onAnswer: (a: boolean | string) => void;
}) {
  const [val, setVal] = useState("");

  if (type === "yes_no") {
    return (
      <div className="flex gap-2 pl-1">
        <button
          type="button"
          disabled={disabled}
          onClick={() => onAnswer(true)}
          className="smallcaps flex-1 border border-claret bg-claret px-4 py-2.5 text-sm font-semibold tracking-[0.2em] text-paper transition hover:bg-claret-deep disabled:opacity-50"
        >
          Yes
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onAnswer(false)}
          className="smallcaps flex-1 border border-rule bg-paper px-4 py-2.5 text-sm font-semibold tracking-[0.2em] text-ink transition hover:border-ink-soft disabled:opacity-50"
        >
          No
        </button>
      </div>
    );
  }

  return (
    <div className="flex gap-2 pl-1">
      <input
        value={val}
        onChange={(e) => setVal(e.target.value)}
        className="serif flex-1 border border-rule bg-paper px-3 py-2.5 text-[15px] text-ink placeholder:italic placeholder:text-ink-soft/70 focus:border-claret focus:outline-none focus:ring-1 focus:ring-claret"
        placeholder="Type your answer"
      />
      <button
        type="button"
        disabled={disabled || val.trim().length === 0}
        onClick={() => onAnswer(val.trim())}
        className="smallcaps border border-claret bg-claret px-4 py-2.5 text-sm font-semibold tracking-[0.2em] text-paper hover:bg-claret-deep disabled:opacity-50"
      >
        Send
      </button>
    </div>
  );
}
