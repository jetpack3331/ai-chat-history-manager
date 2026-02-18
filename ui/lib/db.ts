import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

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
      content_hash TEXT
    );

    CREATE VIRTUAL TABLE IF NOT EXISTS entries_fts
    USING fts5(
      question,
      answer_plain,
      content='entries',
      content_rowid='id'
    );

    CREATE TRIGGER IF NOT EXISTS entries_ai
    AFTER INSERT ON entries
    BEGIN
      INSERT INTO entries_fts(rowid, question, answer_plain)
      VALUES (new.id, new.question, new.answer_plain);
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
      SET question = new.question,
          answer_plain = new.answer_plain
      WHERE rowid = new.id;
    END;

    CREATE INDEX IF NOT EXISTS idx_entries_created_at ON entries(created_at);
    CREATE INDEX IF NOT EXISTS idx_entries_agent ON entries(agent);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_entries_content_hash ON entries(content_hash);
  `);
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
    }
  }
  return db;
}

