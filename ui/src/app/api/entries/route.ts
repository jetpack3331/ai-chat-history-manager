import { NextResponse } from "next/server";
import { Entry, getDb } from "@/lib/db";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limitParam = searchParams.get("limit");
  const limit = Math.min(Number(limitParam) || 10, 100);

  const db = getDb();
  const rows = db
    .prepare<unknown[], Entry>(
      `SELECT id, agent, source_file, question, created_at_raw, created_at,
              answer_plain, answer_html, attachments_raw
       FROM entries
       ORDER BY created_at DESC, id DESC
       LIMIT ?`,
    )
    .all(limit);

  return NextResponse.json(rows);
}

