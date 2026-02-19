import type { Entry, AgentFilter } from "../types";
import { Agents } from "../types";

type GetEntriesParams = {
  agent?: AgentFilter;
  limit?: number;
  offset?: number;
  order?: "asc" | "desc";
};

type SearchEntriesParams = {
  q: string;
  agent?: AgentFilter;
  limit?: number;
};

type ExportJsonParams = {
  agent?: AgentFilter;
  q?: string;
};

const defaultLimit = 10;
const defaultSearchLimit = 5;

/**
 * GET /api/entries – list entries with optional agent filter, limit, offset, order.
 */
export async function getEntries(
  params: GetEntriesParams = {},
): Promise<Entry[]> {
  const {
    agent = Agents.ALL,
    limit = defaultLimit,
    offset = 0,
    order = "desc",
  } = params;
  const searchParams = new URLSearchParams();
  searchParams.set("limit", String(Math.min(limit, 1000)));
  searchParams.set("offset", String(Math.max(0, offset)));
  searchParams.set("order", order);
  if (agent !== Agents.ALL) searchParams.set("agent", agent);
  const res = await fetch(`/api/entries?${searchParams.toString()}`);
  if (!res.ok) throw new Error(`getEntries failed: ${res.status}`);
  return res.json();
}

/**
 * GET /api/search – search entries by query.
 */
export async function searchEntries(
  params: SearchEntriesParams,
): Promise<Entry[]> {
  const { q, agent = Agents.ALL, limit = defaultSearchLimit } = params;
  const searchParams = new URLSearchParams();
  searchParams.set("q", q.trim());
  searchParams.set("limit", String(Math.min(limit, 100)));
  if (agent !== Agents.ALL) searchParams.set("agent", agent);
  const res = await fetch(`/api/search?${searchParams.toString()}`);
  if (!res.ok) throw new Error(`searchEntries failed: ${res.status}`);
  return res.json();
}

/**
 * DELETE /api/entries/[id] – delete a single entry.
 */
export async function deleteEntry(id: number): Promise<void> {
  const res = await fetch(`/api/entries/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`deleteEntry failed: ${res.status}`);
}

/**
 * POST /api/entries-bulk-delete – delete multiple entries by id.
 */
export async function bulkDeleteEntries(ids: number[]): Promise<void> {
  if (ids.length === 0) return;
  const res = await fetch("/api/entries-bulk-delete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids }),
  });
  if (!res.ok) throw new Error(`bulkDeleteEntries failed: ${res.status}`);
}

/**
 * POST /api/reset-agent – delete all entries for the given agent.
 */
export async function resetAgent(agent: string): Promise<void> {
  const res = await fetch("/api/reset-agent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ agent }),
  });
  if (!res.ok) throw new Error(`resetAgent failed: ${res.status}`);
}

/**
 * GET /api/export.json – return export as blob (caller handles download).
 */
export async function getExportJsonBlob(
  params: ExportJsonParams = {},
): Promise<Blob> {
  const { agent = Agents.ALL, q } = params;
  const searchParams = new URLSearchParams();
  if (agent !== Agents.ALL) searchParams.set("agent", agent);
  if (q?.trim()) searchParams.set("q", q.trim());
  const res = await fetch(`/api/export.json?${searchParams.toString()}`);
  if (!res.ok) throw new Error(`getExportJsonBlob failed: ${res.status}`);
  return res.blob();
}
