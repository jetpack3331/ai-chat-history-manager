import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

import { normalizeForMatch } from "./normalize";

let db: Database.Database | null = null;

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

function getDbPath(): string {
  return path.join(process.cwd(), "..", "db", "ai.sqlite");
}

function initSchema(conn: Database.Database): void {
  conn.exec(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS entries (
      id INTEGER PRIMARY KEY,
      agent TEXT NOT NULL,
      source_file TEXT NOT NULL,
      question TEXT NOT NULL,
      created_at_raw TEXT NOT NULL,
      created_at TEXT,
      answer_plain TEXT NOT NULL,
      answer_html TEXT NOT NULL,
      attachments_raw TEXT,
      created_at_imported TEXT DEFAULT (datetime('now')),
      content_hash TEXT,
      question_norm TEXT,
      answer_plain_norm TEXT
    );

    CREATE VIRTUAL TABLE IF NOT EXISTS entries_fts
    USING fts5(
      question_norm,
      answer_plain_norm,
      content='entries',
      content_rowid='id'
    );

    CREATE TRIGGER IF NOT EXISTS entries_ai
    AFTER INSERT ON entries
    BEGIN
      INSERT INTO entries_fts(rowid, question_norm, answer_plain_norm)
      VALUES (new.id, new.question_norm, new.answer_plain_norm);
    END;

    CREATE TRIGGER IF NOT EXISTS entries_ad
    AFTER DELETE ON entries
    BEGIN
      DELETE FROM entries_fts WHERE rowid = old.id;
    END;

    CREATE TRIGGER IF NOT EXISTS entries_au
    AFTER UPDATE ON entries
    BEGIN
      UPDATE entries_fts
      SET question_norm = new.question_norm,
          answer_plain_norm = new.answer_plain_norm
      WHERE rowid = new.id;
    END;

    CREATE INDEX IF NOT EXISTS idx_entries_created_at ON entries(created_at);
    CREATE INDEX IF NOT EXISTS idx_entries_agent ON entries(agent);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_entries_content_hash ON entries(content_hash);
  `);
}

function migrateToNormFts(conn: Database.Database): void {
  const info = conn.prepare("PRAGMA table_info(entries)").all() as { name: string }[];
  const columns = new Set(info.map((r) => r.name));
  if (columns.has("question_norm")) return;

  conn.exec("ALTER TABLE entries ADD COLUMN question_norm TEXT");
  conn.exec("ALTER TABLE entries ADD COLUMN answer_plain_norm TEXT");

  const rows = conn.prepare("SELECT id, question, answer_plain FROM entries").all() as {
    id: number;
    question: string;
    answer_plain: string;
  }[];
  const update = conn.prepare(
    "UPDATE entries SET question_norm = ?, answer_plain_norm = ? WHERE id = ?",
  );
  for (const row of rows) {
    update.run(
      normalizeForMatch(row.question ?? ""),
      normalizeForMatch(row.answer_plain ?? ""),
      row.id,
    );
  }

  conn.exec(`DROP TRIGGER IF EXISTS entries_ai; DROP TRIGGER IF EXISTS entries_ad; DROP TRIGGER IF EXISTS entries_au; DROP TABLE IF EXISTS entries_fts;`);
  conn.exec(`
    CREATE VIRTUAL TABLE entries_fts USING fts5(question_norm, answer_plain_norm, content='entries', content_rowid='id');
    CREATE TRIGGER entries_ai AFTER INSERT ON entries BEGIN INSERT INTO entries_fts(rowid, question_norm, answer_plain_norm) VALUES (new.id, new.question_norm, new.answer_plain_norm); END;
    CREATE TRIGGER entries_ad AFTER DELETE ON entries BEGIN DELETE FROM entries_fts WHERE rowid = old.id; END;
    CREATE TRIGGER entries_au AFTER UPDATE ON entries BEGIN UPDATE entries_fts SET question_norm = new.question_norm, answer_plain_norm = new.answer_plain_norm WHERE rowid = new.id; END;
  `);
  conn.prepare("INSERT INTO entries_fts(entries_fts) VALUES('rebuild')").run();
}

export function getDb(): Database.Database {
  if (!db) {
    const dbPath = getDbPath();
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const exists = fs.existsSync(dbPath);
    db = new Database(dbPath, { fileMustExist: exists });
    if (!exists) {
      initSchema(db);
    } else {
      migrateToNormFts(db);
    }
  }
  return db;
}

