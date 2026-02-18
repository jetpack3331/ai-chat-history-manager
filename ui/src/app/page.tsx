"use client";

import { useEffect, useState, useRef } from "react";

import type { Entry, AgentFilter } from "./types";
import { Agents, parseAgentFilter } from "./types";
import {
  getEntries,
  searchEntries,
  deleteEntry,
  bulkDeleteEntries,
  resetAgent,
  getExportJsonBlob,
} from "./services/entriesApi";
import { AgentBar } from "./components/AgentBar";
import { EntryCard } from "./components/EntryCard";
import { SearchResultsOverlay } from "./components/SearchResultsOverlay";

export default function HomePage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [searchResults, setSearchResults] = useState<Entry[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPlain, setShowPlain] = useState<Record<number, boolean>>({});
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const [selected, setSelected] = useState<Record<number, boolean>>({});
  const [activeAgent, setActiveAgent] = useState<AgentFilter>(Agents.ALL);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchPanelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const saved = (localStorage.getItem("activeAgent") || "").trim();
    const initial = parseAgentFilter(saved);
    setActiveAgent(initial);
    void reload(initial);
  }, []);

  useEffect(() => {
    localStorage.setItem("activeAgent", activeAgent);
  }, [activeAgent]);

  async function reload(agentOverride?: AgentFilter) {
    setLoading(true);
    try {
      const agent = agentOverride ?? activeAgent;
      const data = await getEntries({ agent, limit: 10 });
      setEntries(data);
      setSelected({});
      setExpanded(Object.fromEntries(data.map((e) => [e.id, false])));
    } finally {
      setLoading(false);
      setHasLoadedOnce(true);
    }
  }

  async function runSearch(query: string) {
    const q = query.trim();
    if (!q) {
      setSearchResults([]);
      setSearchOpen(false);
      return;
    }
    const data = await searchEntries({
      q,
      agent: activeAgent,
      limit: 5,
    });
    setSearchResults(data);
    setSearchOpen(data.length > 0);
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
    setSearchResults([]);
    setSearchOpen(false);
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
    await bulkDeleteEntries(ids);
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
    if (activeAgent === Agents.ALL) return;
    if (
      !window.confirm(
        `Are you sure you want to delete all records for agent "${activeAgent}"?`,
      )
    )
      return;
    await resetAgent(activeAgent);
    await reload();
  }

  async function exportJson() {
    const blob = await getExportJsonBlob({
      agent: activeAgent,
      q: search.trim() || undefined,
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ai-export.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleSelectAgent(agent: AgentFilter) {
    setActiveAgent(agent);
    await reload(agent);
    if (search.trim()) void runSearch(search);
  }

  const hasSelection = Object.values(selected).some(Boolean);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        searchPanelRef.current &&
        !searchPanelRef.current.contains(event.target as Node)
      ) {
        setSearchOpen(false);
        setSearchResults([]);
      }
    }
    if (searchOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [searchOpen]);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 overflow-x-hidden">
      <header className="sticky top-0 z-50 bg-slate-950/90 backdrop-blur border-b border-slate-800">
        <div className="w-[90vw] max-w-[1400px] mx-auto flex flex-wrap items-center px-2 py-2 text-sm gap-2">
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
          <div className="h-6 w-px bg-slate-700 mx-2" />
          <div className="flex-1 min-w-[180px] flex items-center">
            <input
              className="w-full max-w-md px-4 py-2 rounded bg-slate-800 text-sm outline-none border border-slate-700 focus:border-sky-500"
              placeholder="Search to add more conversations"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
          </div>
        </div>
      </header>

      {searchOpen && searchResults.length > 0 && (
        <SearchResultsOverlay
          searchResults={searchResults}
          search={search}
          searchPanelRef={searchPanelRef}
          onClose={() => {
            setSearchOpen(false);
            setSearchResults([]);
          }}
          onSelectEntry={addFromSearch}
        />
      )}

      <main className="w-[90vw] max-w-[1400px] mx-auto px-2 py-4 space-y-6 min-w-0 overflow-x-hidden pb-24">
        {loading && (
          <div className="text-sm text-slate-400">Loading…</div>
        )}

        {hasLoadedOnce && !loading && entries.length === 0 && (
          <p className="text-sm text-slate-400">
            No data yet.
          </p>
        )}

        <section className="space-y-3">
          {entries.map((e) => (
            <EntryCard
              key={e.id}
              entry={e}
              isExpanded={expanded[e.id] ?? false}
              usePlain={showPlain[e.id] ?? false}
              isSelected={selected[e.id] ?? false}
              onToggleExpanded={() => toggleExpanded(e.id)}
              onTogglePlain={() => togglePlain(e.id)}
              onToggleSelected={() => toggleSelected(e.id)}
              onRemoveFromView={() =>
                setEntries((prev) => prev.filter((entry) => entry.id !== e.id))
              }
              onDelete={async () => {
                if (
                  !window.confirm("Delete this entry from the database?")
                )
                  return;
                await deleteEntry(e.id);
                setEntries((prev) =>
                  prev.filter((entry) => entry.id !== e.id),
                );
              }}
            />
          ))}
        </section>
      </main>

      <AgentBar
        activeAgent={activeAgent}
        onSelectAgent={handleSelectAgent}
        onReset={handleResetAgent}
        onExport={exportJson}
      />
    </div>
  );
}
