"use client";

import { RefObject } from "react";
import { XMarkIcon } from "@heroicons/react/24/solid";

import type { Entry } from "../types";
import { highlight, snippetAroundMatch, stripHtml } from "../utils";
import { AgentBadge } from "./AgentBadge";

export function SearchResultsOverlay({
  searchResults,
  search,
  searchPanelRef,
  onClose,
  onSelectEntry,
}: {
  searchResults: Entry[];
  search: string;
  searchPanelRef: RefObject<HTMLDivElement | null>;
  onClose: () => void;
  onSelectEntry: (entry: Entry) => void;
}) {
  return (
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
            onClick={onClose}
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
              onClick={() => onSelectEntry(e)}
              className="w-full text-left rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 px-3 py-2 text-sm cursor-pointer"
            >
              <div className="flex items-center gap-2 flex-wrap text-xs text-slate-400 mb-1">
                <AgentBadge agent={e.agent} />
                <span>{e.created_at_raw}</span>
              </div>
              <div className="flex flex-col md:flex-row gap-3">
                <div className="md:w-1/2 text-xs text-slate-200">
                  <span className="font-semibold">
                    {highlight(
                      snippetAroundMatch(e.question ?? "", search, 120),
                      search,
                    )}
                  </span>
                </div>
                <div className="md:w-1/2 text-xs text-slate-400 break-words">
                  {highlight(
                    snippetAroundMatch(
                      stripHtml(e.answer_plain ?? ""),
                      search,
                      160,
                    ),
                    search,
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
