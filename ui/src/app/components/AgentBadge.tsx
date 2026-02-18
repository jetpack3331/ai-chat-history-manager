import { Agents } from "../types";
import { agentBadgeClasses } from "../utils";

export function AgentBadge({ agent }: { agent: string }) {
  const label =
    agent === Agents.GEMINI
      ? "Gemini"
      : agent === Agents.CLAUDE
        ? "Claude"
        : agent === "openai"
          ? "OpenAI"
          : agent || "—";
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ${agentBadgeClasses(agent)}`}
    >
      {label}
    </span>
  );
}
