"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import {
  CheckIcon,
  ClipboardDocumentListIcon,
  ArrowsRightLeftIcon,
  EyeSlashIcon,
  TrashIcon,
} from "@heroicons/react/24/solid";

import type { Entry } from "../types";
import { truncate, isHtmlLike } from "../utils";
import { AgentBadge } from "./AgentBadge";

export function EntryCard({
  entry: e,
  isExpanded,
  usePlain,
  isSelected,
  onToggleExpanded,
  onTogglePlain,
  onToggleSelected,
  onRemoveFromView,
  onDelete,
}: {
  entry: Entry;
  isExpanded: boolean;
  usePlain: boolean;
  isSelected: boolean;
  onToggleExpanded: () => void;
  onTogglePlain: () => void;
  onToggleSelected: () => void;
  onRemoveFromView: () => void;
  onDelete: () => Promise<void>;
}) {
  return (
    <article className="rounded border border-slate-800 bg-slate-900/80 mb-3 overflow-hidden">
      <div className="flex min-w-0">
        <div className="flex flex-col items-center gap-3 p-3 border-r border-slate-800 min-w-[64px]">
          <button
            onClick={onToggleSelected}
            className={`w-10 h-10 flex items-center justify-center rounded-full ${
              isSelected ? "bg-sky-600 text-white" : "bg-slate-800 text-slate-200"
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
            onClick={onTogglePlain}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-indigo-700 text-white cursor-pointer hover:bg-indigo-600"
            title="Toggle Markdown / plain text"
          >
            <ArrowsRightLeftIcon className="w-7 h-7" />
          </button>
          <button
            onClick={onRemoveFromView}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-700 text-white cursor-pointer hover:bg-slate-600"
            title="Hide from view"
          >
            <EyeSlashIcon className="w-7 h-7" />
          </button>
          <button
            onClick={() => void onDelete()}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-red-700 text-white cursor-pointer hover:bg-red-600"
            title="Delete from database"
          >
            <TrashIcon className="w-7 h-7" />
          </button>
        </div>

        <div className="flex-1 min-w-0">
          <header className="px-3 pt-3 pb-2 flex flex-col gap-1 bg-slate-800/70 border-b border-slate-700/80">
            <div className="flex items-center gap-2 flex-wrap">
              <AgentBadge agent={e.agent} />
              <span className="text-xs font-semibold text-slate-300 uppercase tracking-wide">
                {e.created_at_raw}
              </span>
            </div>
            <button
              onClick={onToggleExpanded}
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
              isExpanded
                ? "max-h-[2000px] opacity-100"
                : "max-h-0 opacity-0"
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
                      dangerouslySetInnerHTML={{ __html: e.answer_html }}
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
}
