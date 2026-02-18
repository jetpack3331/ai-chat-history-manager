"use client";

import { useEffect, useState, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import {
  CheckIcon,
  ClipboardDocumentListIcon,
  ArrowsRightLeftIcon,
  EyeSlashIcon,
  TrashIcon,
  XMarkIcon,
} from "@heroicons/react/24/solid";

type Entry = {
  id: number;
  agent: string;
  source_file: string;
  question: string;
  created_at_raw: string;
  created_at: string | null;
  answer_plain: string;
  answer_html: string;
  attachments_raw: string | null;
};

export default function HomePage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [searchResults, setSearchResults] = useState<Entry[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPlain, setShowPlain] = useState<Record<number, boolean>>({});
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const [selected, setSelected] = useState<Record<number, boolean>>({});
  const [activeAgent, setActiveAgent] = useState<"all" | "gemini" | "claude">(
    "all",
  );
  const [searchOpen, setSearchOpen] = useState(false);
  const searchPanelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const saved = (localStorage.getItem("activeAgent") || "").trim();
    const initial =
      saved === "gemini" || saved === "claude" || saved === "all"
        ? (saved as "all" | "gemini" | "claude")
        : "all";
    setActiveAgent(initial);
    void reload(initial);
  }, []);

  useEffect(() => {
    localStorage.setItem("activeAgent", activeAgent);
  }, [activeAgent]);

  async function reload(agentOverride?: "all" | "gemini" | "claude") {
    setLoading(true);
    try {
      const agent = agentOverride ?? activeAgent;
      const params = new URLSearchParams({ limit: "10" });
      if (agent !== "all") params.set("agent", agent);
      const res = await fetch(`/api/entries?${params.toString()}`);
      const data: Entry[] = await res.json();
      setEntries(data);
      setSelected({});
      setExpanded(
        Object.fromEntries(data.map((e) => [e.id, false])),
      );
    } finally {
      setLoading(false);
    }
  }
  async function runSearch(query: string) {
    const q = query.trim();
    if (!q) {
      setSearchResults([]);
      setSearchOpen(false);
      return;
    }
    const params = new URLSearchParams({
      q,
      limit: "5",
    });
    if (activeAgent !== "all") params.set("agent", activeAgent);
    const res = await fetch(`/api/search?${params.toString()}`);
    const data: Entry[] = await res.json();
    // Filter out entries that are already visible in the main list
    const filtered = data.filter(
      (item) => !entries.some((e) => e.id === item.id),
    );
    setSearchResults(filtered);
    setSearchOpen(filtered.length > 0);
  }

  function handleSearchChange(value: string) {
    setSearch(value);
    void runSearch(value);
  }

  function addFromSearch(entry: Entry) {
    setEntries((prev) => {
      if (prev.some((e) => e.id === entry.id)) return prev;
      return [entry, ...prev];
    });
    setExpanded((prev) => ({ ...prev, [entry.id]: true }));
    setSearchResults((prev) => prev.filter((e) => e.id !== entry.id));
  }

  function toggleExpanded(id: number) {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function togglePlain(id: number) {
    setShowPlain((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function toggleSelected(id: number) {
    setSelected((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function selectAll() {
    setSelected(Object.fromEntries(entries.map((e) => [e.id, true])));
  }

  function deselectAll() {
    setSelected({});
  }

  async function deleteSelected() {
    const ids = Object.entries(selected)
      .filter(([, v]) => v)
      .map(([k]) => Number(k));
    if (!ids.length) return;
    const res = await fetch("/api/entries-bulk-delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    });
    if (!res.ok) return;
    setEntries((prev) => prev.filter((e) => !ids.includes(e.id)));
    setSelected({});
  }

  function removeSelectedFromView() {
    const ids = Object.entries(selected)
      .filter(([, v]) => v)
      .map(([k]) => Number(k));
    if (!ids.length) return;
    setEntries((prev) => prev.filter((e) => !ids.includes(e.id)));
    setSelected({});
  }

  async function handleResetAgent() {
    if (activeAgent === "all") return;
    if (
      !window.confirm(
        `Are you sure you want to delete all records for agent "${activeAgent}"?`,
      )
    ) {
      return;
    }
    const res = await fetch("/api/reset-agent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agent: activeAgent }),
    });
    if (res.ok) {
      await reload();
    }
  }

  async function exportJson() {
    const params = new URLSearchParams();
    if (activeAgent !== "all") params.set("agent", activeAgent);
    if (search.trim()) params.set("q", search.trim());
    const res = await fetch(`/api/export.json?${params.toString()}`);
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ai-export.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  const hasSelection = Object.values(selected).some(Boolean);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        searchPanelRef.current &&
        !searchPanelRef.current.contains(event.target as Node)
      ) {
        setSearchOpen(false);
      }
    }
    if (searchOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [searchOpen]);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 overflow-x-hidden">
      <header className="sticky top-0 z-50 bg-slate-950/90 backdrop-blur border-b border-slate-800">
        <div className="w-[90vw] max-w-[1400px] mx-auto flex flex-wrap items-center px-2 py-2 text-sm gap-2">
          {/* Left actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => void reload()}
              className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 cursor-pointer"
            >
              Reload
            </button>
            <button
              onClick={selectAll}
              className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 cursor-pointer"
            >
              Select all
            </button>
            <button
              onClick={deselectAll}
              className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 cursor-pointer"
            >
              Clear selection
            </button>
            <button
              onClick={deleteSelected}
              disabled={!hasSelection}
              className={`px-3 py-1 rounded ${
                hasSelection
                  ? "bg-red-600 hover:bg-red-500 cursor-pointer"
                  : "bg-slate-800 text-slate-500 cursor-not-allowed"
              }`}
            >
              Delete
            </button>
            <button
              onClick={removeSelectedFromView}
              disabled={!hasSelection}
              className={`px-3 py-1 rounded ${
                hasSelection
                  ? "bg-slate-800 hover:bg-slate-700 cursor-pointer"
                  : "bg-slate-800 text-slate-500 cursor-not-allowed"
              }`}
            >
              Remove from view
            </button>
          </div>

          {/* Vertical divider */}
          <div className="h-6 w-px bg-slate-700 mx-2" />

          {/* Search input */}
          <div className="flex-1 min-w-[180px] flex items-center">
            <input
              className="w-full max-w-md px-4 py-2 rounded bg-slate-800 text-sm outline-none border border-slate-700 focus:border-sky-500"
              placeholder="Search in questions and answers…"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
          </div>

          {/* Right-side agent controls */}
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={handleResetAgent}
              disabled={activeAgent === "all"}
              className={`px-3 py-1 rounded ${
                activeAgent === "all"
                  ? "bg-slate-800 text-slate-500 cursor-not-allowed"
                  : "bg-amber-600 hover:bg-amber-500 cursor-pointer"
              }`}
            >
              Reset DB
            </button>
            <button
              onClick={exportJson}
              className="px-3 py-1 rounded bg-sky-600 hover:bg-sky-500 cursor-pointer"
            >
              Export JSON
            </button>
          </div>
        </div>
      </header>

      {/* Search results overlay */}
      {searchOpen && searchResults.length > 0 && (
        <div className="fixed inset-0 z-40 flex items-start justify-center pt-16">
          <div
            ref={searchPanelRef}
            className="w-[90vw] max-w-[1400px] bg-slate-950/95 border border-slate-800 rounded-lg shadow-xl p-4 space-y-3"
          >
            <div className="flex justify-between items-center">
              <h2 className="text-sm font-semibold text-slate-200">
                Search results ({searchResults.length})
              </h2>
              <button
                onClick={() => setSearchOpen(false)}
                className="flex items-center gap-1 px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs cursor-pointer"
              >
                <XMarkIcon className="w-4 h-4" />
                Close
              </button>
            </div>
            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
              {searchResults.map((e) => (
                <button
                  key={e.id}
                  onClick={() => addFromSearch(e)}
                  className="w-full text-left rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 px-3 py-2 text-sm cursor-pointer"
                >
                  <div className="flex justify-between items-center text-xs text-slate-400 mb-1">
                    <span>{e.created_at_raw}</span>
                  </div>
                  <div className="flex flex-col md:flex-row gap-3">
                    <div className="md:w-1/2 text-xs text-slate-200">
                      <span className="font-semibold">
                        {highlight(truncate(e.question, 120), search)}
                      </span>
                    </div>
                    <div className="md:w-1/2 text-xs text-slate-400">
                      {truncate(e.answer_plain, 160)}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <main className="w-[90vw] max-w-[1400px] mx-auto px-2 py-4 space-y-6 min-w-0 overflow-x-hidden pb-24">
        {loading && <div className="text-sm text-slate-400">Loading…</div>}

        {!loading && entries.length === 0 && (
          <section className="rounded border border-dashed border-slate-700 bg-slate-900/60 p-4 text-sm text-slate-200 space-y-2">
            <p className="font-semibold">
              There are currently no records to display in the database.
            </p>
            <p>
              Run the Python importer on the backend to populate the SQLite
              database from the Gemini HTML export (or another agent):
            </p>
            <pre className="whitespace-pre-wrap bg-slate-950/60 border border-slate-800 rounded px-3 py-2 text-xs text-slate-100">
              {`cd ..  # go to project root (ai-chat-history-manager)
python -m parsers.gemini_parser --input source/gemini.html --db db/ai.sqlite --limit 20`}
            </pre>
            <p className="text-xs text-slate-400">
              After a successful import, click “Reload” in the top menu.
            </p>
          </section>
        )}

        {searchResults.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-slate-300 mb-2">
              Search results ({searchResults.length})
            </h2>
            <div className="space-y-2">
              {searchResults.map((e) => (
                <button
                  key={e.id}
                  onClick={() => addFromSearch(e)}
                  className="w-full text-left px-3 py-2 rounded bg-slate-800 hover:bg-slate-700 text-sm cursor-pointer"
                >
                  <div className="flex justify-between gap-2">
                    <span className="font-medium">
                      {highlight(e.question, search)}
                    </span>
                    <span className="text-xs text-slate-400">
                      {e.created_at_raw}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        <section className="space-y-3">
          {entries.map((e) => {
            const isExpanded = expanded[e.id] ?? false;
            const usePlain = showPlain[e.id] ?? false;
            const isSelected = selected[e.id] ?? false;
            return (
              <article
                key={e.id}
                className="rounded border border-slate-800 bg-slate-900/80 mb-3 overflow-hidden"
              >
                <div className="flex min-w-0">
                  {/* Vertical action menu */}
                  <div className="flex flex-col items-center gap-3 p-3 border-r border-slate-800 min-w-[64px]">
                    <button
                      onClick={() => toggleSelected(e.id)}
                      className={`w-10 h-10 flex items-center justify-center rounded-full ${
                        isSelected
                          ? "bg-sky-600 text-white"
                          : "bg-slate-800 text-slate-200"
                      } cursor-pointer`}
                      title={isSelected ? "Uncheck" : "Check"}
                    >
                      <CheckIcon className="w-7 h-7" />
                    </button>
                    <button
                      onClick={() =>
                        navigator.clipboard.writeText(
                          usePlain ? e.answer_plain : e.answer_html,
                        )
                      }
                      className="w-10 h-10 flex items-center justify-center rounded-full bg-emerald-700 text-white cursor-pointer hover:bg-emerald-600"
                      title={
                        usePlain
                          ? "Copy answer (plain text)"
                          : "Copy answer (Markdown/HTML)"
                      }
                    >
                      <ClipboardDocumentListIcon className="w-7 h-7" />
                    </button>
                    <button
                      onClick={() => togglePlain(e.id)}
                      className="w-10 h-10 flex items-center justify-center rounded-full bg-indigo-700 text-white cursor-pointer hover:bg-indigo-600"
                      title="Toggle Markdown / plain text"
                    >
                      <ArrowsRightLeftIcon className="w-7 h-7" />
                    </button>
                    <button
                      onClick={() =>
                        setEntries((prev) =>
                          prev.filter((entry) => entry.id !== e.id),
                        )
                      }
                      className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-700 text-white cursor-pointer hover:bg-slate-600"
                      title="Hide from view"
                    >
                      <EyeSlashIcon className="w-7 h-7" />
                    </button>
                    <button
                      onClick={async () => {
                        if (
                          !window.confirm(
                            "Delete this entry from the database?",
                          )
                        ) {
                          return;
                        }
                        await fetch(`/api/entries/${e.id}`, {
                          method: "DELETE",
                        });
                        setEntries((prev) =>
                          prev.filter((entry) => entry.id !== e.id),
                        );
                      }}
                      className="w-10 h-10 flex items-center justify-center rounded-full bg-red-700 text-white cursor-pointer hover:bg-red-600"
                      title="Delete from database"
                    >
                      <TrashIcon className="w-7 h-7" />
                    </button>
                  </div>

                  {/* Content area */}
                  <div className="flex-1 min-w-0">
                    <header className="px-3 pt-3 pb-2 flex flex-col gap-1 bg-slate-800/70 border-b border-slate-700/80">
                      <span className="text-xs font-semibold text-slate-300 uppercase tracking-wide">
                        {e.created_at_raw}
                      </span>
                      <button
                        onClick={() => toggleExpanded(e.id)}
                        className="text-left text-sm font-semibold text-sky-300 truncate cursor-pointer hover:text-sky-200"
                        title={e.question}
                      >
                        {truncate(e.question, 200)}
                      </button>
                      {!isExpanded && (
                        <p className="text-xs text-slate-300 mt-1">
                          {truncate(e.answer_plain, 480)}
                        </p>
                      )}
                    </header>

                    <div
                      className={`border-t border-slate-800 overflow-hidden transition-all duration-300 ${
                        isExpanded ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
                      }`}
                    >
                      <div className="p-3 flex flex-col md:flex-row gap-4 min-w-0 overflow-hidden">
                        <div className="md:w-1/2 min-w-0 overflow-hidden text-sm whitespace-pre-wrap rounded bg-emerald-900/60 text-emerald-50 border border-emerald-800/70 p-3">
                          {e.question}
                        </div>
                        <div className="md:w-1/2 min-w-0 flex flex-col min-h-0 rounded bg-slate-800/80 text-slate-50 border border-slate-700 p-3">
                          <div className="flex justify-between items-center text-xs text-slate-300 shrink-0">
                            <span>Answer</span>
                            <span className="italic">
                              {usePlain ? "Plain text" : "Markdown / HTML"}
                            </span>
                          </div>
                          <div className="prose prose-invert max-w-full text-sm break-words min-w-0 overflow-x-auto mt-2 flex-1 [&_pre]:max-w-full [&_pre]:overflow-x-auto [&_code]:break-all [&_code]:max-w-full [&_p]:mb-3 [&_p]:mt-0 [&_p:first-child]:mt-0 [&_br]:block">
                            {usePlain ? (
                              <pre className="whitespace-pre-wrap text-sm bg-slate-950/40 p-2 rounded border border-slate-800">
                                {e.answer_plain}
                              </pre>
                            ) : isHtmlLike(e.answer_html) ? (
                              <div
                                className="[&_p]:mb-3 [&_p]:mt-0 [&_br]:block"
                                dangerouslySetInnerHTML={{
                                  __html: e.answer_html,
                                }}
                              />
                            ) : (
                              <ReactMarkdown
                                remarkPlugins={[remarkGfm, remarkBreaks]}
                                components={{
                                  pre: (props) => (
                                    <pre
                                      className="whitespace-pre-wrap break-words text-sm bg-slate-950/40 p-2 rounded border border-slate-800 overflow-x-auto"
                                      {...props}
                                    />
                                  ),
                                  code: (props) => (
                                    <code className="break-words" {...props} />
                                  ),
                                }}
                              >
                                {e.answer_html}
                              </ReactMarkdown>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      </main>

      {/* Bottom agent bar */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[90vw] max-w-[1400px]">
        <div className="rounded-2xl border border-slate-800 bg-slate-950/95 backdrop-blur px-4 py-3 shadow-lg">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-base font-semibold text-slate-200 shrink-0">
                Agent:
              </span>
              <div className="flex items-center gap-2 text-sm">
                <AgentLink
                  label="All"
                  active={activeAgent === "all"}
                  onClick={async () => {
                    setActiveAgent("all");
                    await reload("all");
                    if (search.trim()) void runSearch(search);
                  }}
                />
                <span className="text-slate-600">|</span>
                <AgentLink
                  label="Gemini"
                  active={activeAgent === "gemini"}
                  onClick={async () => {
                    setActiveAgent("gemini");
                    await reload("gemini");
                    if (search.trim()) void runSearch(search);
                  }}
                />
                <span className="text-slate-600">|</span>
                <AgentLink
                  label="Claude"
                  active={activeAgent === "claude"}
                  onClick={async () => {
                    setActiveAgent("claude");
                    await reload("claude");
                    if (search.trim()) void runSearch(search);
                  }}
                />
              </div>
            </div>

            {/* Reserved space for future controls */}
            <div className="flex items-center gap-2 text-xs text-slate-400" />
          </div>
        </div>
      </div>
    </div>
  );
}

function AgentLink({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void | Promise<void>;
}) {
  return (
    <button
      type="button"
      onClick={() => void onClick()}
      className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 cursor-pointer transition border ${
        active
          ? "border-sky-400 text-sky-200 bg-sky-500/10"
          : "border-transparent text-slate-200 hover:text-white hover:bg-slate-800/60"
      }`}
      aria-pressed={active}
    >
      {active && <span className="text-sky-300">●</span>}
      <span className="font-medium">{label}</span>
    </button>
  );
}

function highlight(text: string, query: string) {
  if (!query) return text;
  const q = query.trim();
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if (idx === -1) return text;
  const before = text.slice(0, idx);
  const match = text.slice(idx, idx + q.length);
  const after = text.slice(idx + q.length);
  return (
    <>
      {before}
      <mark className="bg-yellow-400/60 text-black">{match}</mark>
      {after}
    </>
  );
}

function truncate(text: string, maxLength: number) {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 1) + "…";
}

function isHtmlLike(content: string) {
  const trimmed = content.trim();
  if (!trimmed) return false;
  if (!trimmed.startsWith("<")) return false;
  return /<\/[a-z][\s\S]*?>/i.test(trimmed);
}


