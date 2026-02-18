import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

const ALLOWED_AGENTS = ["gemini", "openai", "claude"];

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const agent: string | undefined = body?.agent;

  if (!agent || !ALLOWED_AGENTS.includes(agent)) {
    return NextResponse.json({ error: "Neplatný agent" }, { status: 400 });
  }

  const db = getDb();
  const stmt = db.prepare("DELETE FROM entries WHERE agent = ?");
  const info = stmt.run(agent);

  return NextResponse.json({ deleted: info.changes ?? 0 });
}

