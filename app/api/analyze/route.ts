import { NextRequest, NextResponse } from "next/server";
import { analyze } from "@/lib/detection/analyze";
import type { AnalyzeRequest } from "@/lib/detection/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_TEXT = 4000;

export async function POST(req: NextRequest) {
  let body: AnalyzeRequest;
  try {
    body = (await req.json()) as AnalyzeRequest;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (!body || typeof body.text !== "string" || body.text.trim().length === 0) {
    return NextResponse.json({ error: "text_required" }, { status: 400 });
  }
  if (body.text.length > MAX_TEXT) {
    return NextResponse.json({ error: "text_too_long" }, { status: 400 });
  }

  const result = analyze({
    text: body.text,
    category_hint: body.category_hint,
    prior_signals: body.prior_signals ?? null,
    follow_up_count: body.follow_up_count ?? 0,
    follow_up_answers: body.follow_up_answers ?? {}
  });

  return NextResponse.json(result);
}
