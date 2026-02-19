"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronRightIcon, ChevronDownIcon } from "@heroicons/react/24/solid";

import type { AgentFilter } from "../types";
import { Agents } from "../types";
import { AgentLink } from "./AgentLink";

export function AgentBar({
  activeAgent,
  onSelectAgent,
  onReset,
  onExport,
  pageSize,
  setPageSize,
  sortOrder,
  setSortOrder,
}: {
  activeAgent: AgentFilter;
  onSelectAgent: (agent: AgentFilter) => void | Promise<void>;
  onReset: () => void;
  onExport: () => void;
  pageSize: number;
  setPageSize: (n: number) => void;
  sortOrder: "desc" | "asc";
  setSortOrder: (o: "desc" | "asc") => void;
}) {
  const [actionsOpen, setActionsOpen] = useState(false);
  const actionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        actionsRef.current &&
        !actionsRef.current.contains(event.target as Node)
      ) {
        setActionsOpen(false);
      }
    }
    if (actionsOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [actionsOpen]);

  const resetDisabled = activeAgent === Agents.ALL;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[90vw] max-w-[1400px]">
      <div className="rounded-2xl border border-slate-800 bg-slate-950/95 backdrop-blur px-4 py-3 shadow-lg">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2 min-w-0 flex-wrap">
            <div className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2">
              <span className="text-base font-semibold text-slate-200 shrink-0">
                Agent:
              </span>
              <div className="flex items-center gap-2 text-sm">
                <AgentLink
                  label="All"
                  agentKey={Agents.ALL}
                  active={activeAgent === Agents.ALL}
                  onClick={() => void onSelectAgent(Agents.ALL)}
                />
                <span className="text-slate-600">|</span>
                <AgentLink
                  label="Gemini"
                  agentKey={Agents.GEMINI}
                  active={activeAgent === Agents.GEMINI}
                  onClick={() => void onSelectAgent(Agents.GEMINI)}
                />
                <span className="text-slate-600">|</span>
                <AgentLink
                  label="Claude"
                  agentKey={Agents.CLAUDE}
                  active={activeAgent === Agents.CLAUDE}
                  onClick={() => void onSelectAgent(Agents.CLAUDE)}
                />
              </div>
              <ChevronRightIcon
                className="w-5 h-5 text-slate-500 shrink-0"
                aria-hidden
              />
            </div>
            <div className="relative" ref={actionsRef}>
              <button
                type="button"
                onClick={() => setActionsOpen((o) => !o)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium cursor-pointer"
              >
                Actions
                <ChevronDownIcon
                  className={`w-4 h-4 transition-transform ${actionsOpen ? "rotate-180" : ""}`}
                  aria-hidden
                />
              </button>
              {actionsOpen && (
                <div className="absolute left-0 bottom-full mb-1 rounded-lg border border-slate-700 bg-slate-900 shadow-xl py-1 min-w-[140px] z-10">
                  <button
                    type="button"
                    disabled={resetDisabled}
                    onClick={() => {
                      setActionsOpen(false);
                      void onReset();
                    }}
                    className={`w-full text-left px-3 py-2 text-sm ${
                      resetDisabled
                        ? "text-slate-500 cursor-not-allowed"
                        : "text-slate-200 hover:bg-slate-800 cursor-pointer"
                    }`}
                  >
                    Reset DB
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActionsOpen(false);
                      void onExport();
                    }}
                    className="w-full text-left px-3 py-2 text-sm text-slate-200 hover:bg-slate-800 cursor-pointer"
                  >
                    Export JSON
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2 flex-wrap">
            <span className="text-slate-400 text-xs shrink-0">Sort</span>
            <select
              value={sortOrder}
              onChange={(e) =>
                setSortOrder(e.target.value as "desc" | "asc")
              }
              className="px-2 py-1 rounded-lg bg-slate-800 border border-slate-700 text-sm cursor-pointer"
            >
              <option value="desc">Newest first</option>
              <option value="asc">Oldest first</option>
            </select>
            <span className="text-slate-400 text-xs shrink-0">Page size</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="px-2 py-1 rounded-lg bg-slate-800 border border-slate-700 text-sm cursor-pointer"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={1000}>1000</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
