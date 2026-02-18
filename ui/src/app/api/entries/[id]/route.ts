import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id: idParam } = await context.params;
  const id = Number(idParam);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "Neplatné id" }, { status: 400 });
  }

  const db = getDb();
  const stmt = db.prepare("DELETE FROM entries WHERE id = ?");
  const info = stmt.run(id);

  return NextResponse.json({ deleted: info.changes ?? 0 });
}

