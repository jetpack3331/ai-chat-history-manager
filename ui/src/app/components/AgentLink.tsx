type AgentKey = "all" | "gemini" | "claude";

export function AgentLink({
  label,
  agentKey,
  active,
  onClick,
}: {
  label: string;
  agentKey: AgentKey;
  active: boolean;
  onClick: () => void | Promise<void>;
}) {
  const baseClasses =
    agentKey === "all"
      ? "bg-slate-600 text-slate-100 border-slate-500/80"
      : agentKey === "gemini"
        ? "bg-cyan-600 text-white border-cyan-500/80"
        : "bg-amber-600 text-white border-amber-500/80";
  return (
    <button
      type="button"
      onClick={() => void onClick()}
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-semibold uppercase tracking-wide cursor-pointer transition ${
        active
          ? `${baseClasses} ring-2 ring-white/50 ring-offset-2 ring-offset-slate-950`
          : `${baseClasses} opacity-70 hover:opacity-100`
      }`}
      aria-pressed={active}
    >
      {active && <span className="text-white/90">●</span>}
      <span>{label}</span>
    </button>
  );
}
