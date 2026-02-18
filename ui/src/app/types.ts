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
