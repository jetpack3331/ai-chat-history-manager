import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const ids: unknown = body?.ids;

  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "Pole ids je povinné" }, { status: 400 });
  }

  const numericIds = ids
    .map((v) => Number(v))
    .filter((n) => Number.isInteger(n) && n > 0);

  if (numericIds.length === 0) {
    return NextResponse.json({ error: "Žádné platné id" }, { status: 400 });
  }

  const db = getDb();
  const placeholders = numericIds.map(() => "?").join(", ");
  const stmt = db.prepare(`DELETE FROM entries WHERE id IN (${placeholders})`);
  const info = stmt.run(...numericIds);

  return NextResponse.json({ deleted: info.changes ?? 0 });
}

