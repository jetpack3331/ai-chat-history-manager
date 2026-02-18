"use client";

import type { AgentFilter } from "../types";
import { Agents } from "../types";
import { AgentLink } from "./AgentLink";

export function AgentBar({
  activeAgent,
  onSelectAgent,
  onReset,
  onExport,
}: {
  activeAgent: AgentFilter;
  onSelectAgent: (agent: AgentFilter) => void | Promise<void>;
  onReset: () => void;
  onExport: () => void;
}) {
  return (
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
          </div>

          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={onReset}
              disabled={activeAgent === Agents.ALL}
              className={`px-3 py-1.5 rounded-lg text-sm ${
                activeAgent === Agents.ALL
                  ? "bg-slate-800 text-slate-500 cursor-not-allowed"
                  : "bg-amber-600 hover:bg-amber-500 cursor-pointer"
              }`}
            >
              Reset DB
            </button>
            <button
              onClick={onExport}
              className="px-3 py-1.5 rounded-lg text-sm bg-sky-600 hover:bg-sky-500 cursor-pointer"
            >
              Export JSON
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
