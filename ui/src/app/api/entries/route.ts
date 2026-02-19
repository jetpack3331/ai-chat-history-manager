import { NextResponse } from "next/server";
import { Entry, getDb } from "@/lib/db";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const agent = (searchParams.get("agent") || "").trim();
  const limitParam = searchParams.get("limit");
  const limit = Math.min(Number(limitParam) || 10, 1000);
  const offsetParam = searchParams.get("offset");
  const offset = Math.max(0, Number(offsetParam) || 0);
  const orderParam = (searchParams.get("order") || "desc").toLowerCase();
  const order = orderParam === "asc" ? "ASC" : "DESC";

  const db = getDb();
  const baseSelect = `SELECT id, agent, source_file, question, created_at_raw, created_at,
       answer_plain, answer_html, attachments_raw
       FROM entries`;
  const orderClause = `ORDER BY created_at ${order}, id ${order}`;
  const limitOffset = `LIMIT ? OFFSET ?`;

  const rows = agent
    ? db
        .prepare<unknown[], Entry>(
          `${baseSelect} WHERE agent = ? ${orderClause} ${limitOffset}`,
        )
        .all(agent, limit, offset)
    : db
        .prepare<unknown[], Entry>(`${baseSelect} ${orderClause} ${limitOffset}`)
        .all(limit, offset);

  return NextResponse.json(rows);
}

