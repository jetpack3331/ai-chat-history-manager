import { NextResponse } from "next/server";
import { Entry, getDb } from "@/lib/db";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") || "").trim();
  const agent = (searchParams.get("agent") || "").trim();
  const offset = Number(searchParams.get("offset") || "0");
  const limit = Math.min(Number(searchParams.get("limit") || "20"), 100);

  if (!q) {
    return NextResponse.json([], { status: 200 });
  }

  const db = getDb();

  // Build a prefix-search FTS query so that e.g. "exp" matches "export".
  const terms = q.split(/\s+/).filter(Boolean);
  const ftsQuery = terms.map((t) => `${t}*`).join(" ");

  const rows = db
    .prepare<unknown[], Entry>(
      `
      SELECT e.id, e.agent, e.source_file, e.question, e.created_at_raw, e.created_at,
             e.answer_plain, e.answer_html, e.attachments_raw
      FROM entries e
      JOIN entries_fts f ON f.rowid = e.id
      WHERE f.entries_fts MATCH ?
      ${agent ? "AND e.agent = ?" : ""}
      ORDER BY e.created_at DESC, e.id DESC
      LIMIT ? OFFSET ?
      `,
    )
    .all(...(agent ? [ftsQuery, agent, limit, offset] : [ftsQuery, limit, offset]));

  return NextResponse.json(rows);
}

