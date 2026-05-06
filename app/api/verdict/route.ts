import { NextRequest, NextResponse } from "next/server";
import { getStorage } from "@/lib/storage";
import type { FinalVerdict } from "@/lib/detection/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface SaveBody {
  verdict: FinalVerdict;
  session_id?: string;
  user_text?: string;
}

export async function POST(req: NextRequest) {
  let body: SaveBody;
  try {
    body = (await req.json()) as SaveBody;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (!body?.verdict || typeof body.verdict !== "object") {
    return NextResponse.json({ error: "verdict_required" }, { status: 400 });
  }

  const storage = getStorage();
  const id = await storage.saveVerdict(body.verdict);

  if (body.session_id && body.user_text) {
    try {
      await storage.recordInteraction({
        session_id: body.session_id,
        user_text: body.user_text,
        category: body.verdict.category,
        signals: body.verdict.signals,
        verdict_id: id
      });
    } catch {}
  }

  return NextResponse.json({ id });
}
