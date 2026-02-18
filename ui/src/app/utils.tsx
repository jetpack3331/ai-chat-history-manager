import React from "react";
import { normalizePreserveLength } from "@/lib/normalize";
import { Agents } from "./types";

export function highlight(text: string, query: string): React.ReactElement | string {
  const safeText = text ?? "";
  const q = (query ?? "").trim();
  if (!q) return safeText;
  const textNorm = normalizePreserveLength(safeText);
  const qNorm = normalizePreserveLength(q);
  const idx = textNorm.indexOf(qNorm);
  if (idx === -1) return safeText;
  const before = safeText.slice(0, idx);
  const match = safeText.slice(idx, idx + q.length);
  const after = safeText.slice(idx + q.length);
  return (
    <>
      {before}
      <mark className="bg-yellow-400/60 text-black">{match}</mark>
      {after}
    </>
  );
}

export function truncate(text: string, maxLength: number): string {
  const s = text ?? "";
  if (s.length <= maxLength) return s;
  return s.slice(0, maxLength - 1) + "…";
}

/**
 * Return a snippet of text centered around the first occurrence of the query
 * (match found via normalized text so "moz" finds "možná"). Length is roughly
 * maxLength. Adds "…" when text is cut at start or end.
 */
export function snippetAroundMatch(
  text: string,
  query: string,
  maxLength: number,
): string {
  const s = text ?? "";
  const q = (query ?? "").trim();
  if (!q || s.length <= maxLength) return truncate(s, maxLength);

  const textNorm = normalizePreserveLength(s);
  const qNorm = normalizePreserveLength(q);
  const matchIndex = textNorm.indexOf(qNorm);
  if (matchIndex === -1) return truncate(s, maxLength);

  const half = Math.floor(maxLength / 2);
  let start = Math.max(0, matchIndex - half);
  const end = Math.min(s.length, start + maxLength);
  if (end - start < maxLength && start > 0) {
    start = Math.max(0, end - maxLength);
  }
  const prefix = start > 0 ? "… " : "";
  const suffix = end < s.length ? " …" : "";
  return prefix + s.slice(start, end) + suffix;
}

export function isHtmlLike(content: string): boolean {
  const trimmed = content.trim();
  if (!trimmed) return false;
  if (!trimmed.startsWith("<")) return false;
  return /<\/[a-z][\s\S]*?>/i.test(trimmed);
}

/** Strip HTML tags for plain-text display (e.g. search result snippet). */
export function stripHtml(s: string): string {
  if (!s) return "";
  return (s ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Badge/button colors per agent – shared by AgentBadge and AgentLink. */
export function agentBadgeClasses(agent: string): string {
  const a = (agent ?? "").toLowerCase();
  switch (a) {
    case Agents.GEMINI:
      return "bg-cyan-600 text-white border-cyan-500/80";
    case Agents.CLAUDE:
      return "bg-amber-600 text-white border-amber-500/80";
    case "openai":
      return "bg-emerald-600 text-white border-emerald-500/80";
    default:
      return "bg-slate-600 text-slate-100 border-slate-500/80";
  }
}
