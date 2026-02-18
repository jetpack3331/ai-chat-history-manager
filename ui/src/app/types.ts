export type Entry = {
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

/** Agent filter values for listing/search/export. Use these constants instead of string literals. */
export const Agents = {
  ALL: "all",
  GEMINI: "gemini",
  CLAUDE: "claude",
} as const;

export type AgentFilter = (typeof Agents)[keyof typeof Agents];

/** Parse localStorage or URL value to AgentFilter; returns Agents.ALL when invalid. */
export function parseAgentFilter(s: string): AgentFilter {
  if (s === Agents.ALL || s === Agents.GEMINI || s === Agents.CLAUDE) return s;
  return Agents.ALL;
}
