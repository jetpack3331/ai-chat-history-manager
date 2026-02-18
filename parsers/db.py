import os
import sqlite3
from pathlib import Path
from typing import Optional

from .normalize import normalize_for_match

DB_PATH_DEFAULT = Path("db") / "ai.sqlite"


def get_connection(db_path: Optional[os.PathLike] = None) -> sqlite3.Connection:
    """Return a SQLite connection and ensure the ``db/`` directory exists."""
    if db_path is None:
        db_path = DB_PATH_DEFAULT

    db_path = Path(db_path)
    if not db_path.parent.exists():
        db_path.parent.mkdir(parents=True, exist_ok=True)

    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn


def init_schema(conn: sqlite3.Connection) -> None:
    """Create the ``entries`` table and FTS5 ``entries_fts`` table including triggers.

    This function is idempotent (uses IF NOT EXISTS).
    """
    cursor = conn.cursor()

    cursor.executescript(
        """
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

        CREATE INDEX IF NOT EXISTS idx_entries_created_at
            ON entries(created_at);

        CREATE INDEX IF NOT EXISTS idx_entries_agent
            ON entries(agent);
        """
    )

    cursor.execute("PRAGMA table_info(entries)")
    columns = {row[1] for row in cursor.fetchall()}

    if "content_hash" not in columns:
        cursor.execute("ALTER TABLE entries ADD COLUMN content_hash TEXT")
    if "question_norm" not in columns:
        cursor.execute("ALTER TABLE entries ADD COLUMN question_norm TEXT")
    if "answer_plain_norm" not in columns:
        cursor.execute("ALTER TABLE entries ADD COLUMN answer_plain_norm TEXT")
    cursor.execute(
        "CREATE UNIQUE INDEX IF NOT EXISTS idx_entries_content_hash "
        "ON entries(content_hash)"
    )
    conn.commit()

    # Backfill norm columns for rows that have NULL (existing data)
    cursor.execute(
        "SELECT id, question, answer_plain FROM entries WHERE question_norm IS NULL"
    )
    rows = cursor.fetchall()
    for row in rows:
        q_norm = normalize_for_match(row["question"] or "")
        a_norm = normalize_for_match(row["answer_plain"] or "")
        cursor.execute(
            "UPDATE entries SET question_norm = ?, answer_plain_norm = ? WHERE id = ?",
            (q_norm, a_norm, row["id"]),
        )
    conn.commit()

    # Replace FTS with norm-based index (drop old, create new, rebuild)
    cursor.executescript(
        """
        DROP TRIGGER IF EXISTS entries_ai;
        DROP TRIGGER IF EXISTS entries_ad;
        DROP TRIGGER IF EXISTS entries_au;
        DROP TABLE IF EXISTS entries_fts;
        """
    )
    cursor.executescript(
        """
        CREATE VIRTUAL TABLE entries_fts USING fts5(
            question_norm,
            answer_plain_norm,
            content='entries',
            content_rowid='id'
        );

        CREATE TRIGGER entries_ai AFTER INSERT ON entries
        BEGIN
            INSERT INTO entries_fts(rowid, question_norm, answer_plain_norm)
            VALUES (new.id, new.question_norm, new.answer_plain_norm);
        END;

        CREATE TRIGGER entries_ad AFTER DELETE ON entries
        BEGIN
            DELETE FROM entries_fts WHERE rowid = old.id;
        END;

        CREATE TRIGGER entries_au AFTER UPDATE ON entries
        BEGIN
            UPDATE entries_fts
            SET question_norm = new.question_norm,
                answer_plain_norm = new.answer_plain_norm
            WHERE rowid = new.id;
        END;
        """
    )
    cursor.execute("INSERT INTO entries_fts(entries_fts) VALUES('rebuild')")
    conn.commit()


def reset_agent(conn: sqlite3.Connection, agent: str) -> int:
    """Delete all records for the given agent and return the number of deleted rows."""
    cursor = conn.cursor()
    cursor.execute("DELETE FROM entries WHERE agent = ?", (agent,))
    deleted = cursor.rowcount
    conn.commit()
    return deleted


def insert_entry(
    conn: sqlite3.Connection,
    *,
    agent: str,
    source_file: str,
    question: str,
    created_at_raw: str,
    created_at: Optional[str],
    answer_plain: str,
    answer_html: str,
    attachments_raw: Optional[str],
    content_hash: str,
) -> int:
    """Insert a single row into ``entries`` and return its id."""
    question_norm = normalize_for_match(question)
    answer_plain_norm = normalize_for_match(answer_plain)
    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT OR IGNORE INTO entries (
            agent,
            source_file,
            question,
            created_at_raw,
            created_at,
            answer_plain,
            answer_html,
            attachments_raw,
            content_hash,
            question_norm,
            answer_plain_norm
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            agent,
            source_file,
            question,
            created_at_raw,
            created_at,
            answer_plain,
            answer_html,
            attachments_raw,
            content_hash,
            question_norm,
            answer_plain_norm,
        ),
    )
    conn.commit()
    # If the row was ignored due to duplicate content_hash, lastrowid stays
    # on the previous value and rowcount will be 0.
    if cursor.rowcount == 0:
        return 0
    return int(cursor.lastrowid)

