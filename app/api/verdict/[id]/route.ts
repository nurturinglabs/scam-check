import { NextRequest, NextResponse } from "next/server";
import { getStorage } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = params.id;
  if (!id || !/^[a-z0-9]{4,12}$/i.test(id)) {
    return NextResponse.json({ error: "invalid_id" }, { status: 400 });
  }
  const v = await getStorage().getVerdict(id);
  if (!v) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json(v);
}
