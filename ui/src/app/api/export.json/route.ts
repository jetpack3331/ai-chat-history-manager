import { NextResponse } from "next/server";
import { Entry, getDb } from "@/lib/db";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const agent = (searchParams.get("agent") || "").trim();
  const q = (searchParams.get("q") || "").trim();

  const db = getDb();

  let rows: Entry[];

  if (q) {
    // export s fulltext filtrem
    rows = db
      .prepare<unknown[], Entry>(
        `
        SELECT e.id, e.agent, e.source_file, e.question, e.created_at_raw, e.created_at,
               e.answer_plain, e.answer_html, e.attachments_raw
        FROM entries e
        JOIN entries_fts f ON f.rowid = e.id
        WHERE f.entries_fts MATCH ?
        ${agent ? "AND e.agent = ?" : ""}
        ORDER BY e.created_at DESC, e.id DESC
        `,
      )
      .all(...(agent ? [q, agent] : [q]));
  } else if (agent) {
    rows = db
      .prepare<unknown[], Entry>(
        `
        SELECT id, agent, source_file, question, created_at_raw, created_at,
               answer_plain, answer_html, attachments_raw
        FROM entries
        WHERE agent = ?
        ORDER BY created_at DESC, id DESC
        `,
      )
      .all(agent);
  } else {
    rows = db
      .prepare<unknown[], Entry>(
        `
        SELECT id, agent, source_file, question, created_at_raw, created_at,
               answer_plain, answer_html, attachments_raw
        FROM entries
        ORDER BY created_at DESC, id DESC
        `,
      )
      .all();
  }

  return NextResponse.json(rows);
}

