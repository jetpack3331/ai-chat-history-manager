"""
Parse Claude conversations.json export into the shared SQLite entries table.

Uses ijson to stream the top-level array so that only one conversation
is in memory at a time (suitable for very large exports).
"""

import argparse
import hashlib
import json
import re
from pathlib import Path
from typing import Optional

import ijson

from .db import DB_PATH_DEFAULT, get_connection, init_schema, insert_entry


def normalize_created_at(iso_str: str) -> Optional[str]:
    """Convert ISO timestamp (e.g. 2025-11-22T06:38:55.879766Z) to YYYY-MM-DD HH:MM:SS."""
    if not iso_str:
        return None
    # Drop timezone suffix and fractional seconds for consistent sorting
    normalized = iso_str.replace("Z", "").replace("+00:00", "").strip()
    if "T" in normalized:
        date_part, time_part = normalized.split("T", 1)
        time_part = time_part.split(".")[0]  # drop microseconds
        return f"{date_part} {time_part}"
    return normalized


def extract_qa_pairs(chat_messages: list) -> list[dict]:
    """
    From a list of chat_messages (each with sender, text, created_at, uuid, etc.),
    yield one dict per human message + following assistant block.

    Each dict has: question, created_at_raw, created_at, answer_plain, attachments_raw,
    human_message_uuid (for content_hash).
    """
    if not chat_messages:
        return []
    pairs: list[dict] = []
    i = 0
    while i < len(chat_messages):
        msg = chat_messages[i]
        sender = (msg.get("sender") or "").lower()
        if sender != "human":
            i += 1
            continue
        question = (msg.get("text") or "").strip()
        created_at_raw = msg.get("created_at") or ""
        created_at = normalize_created_at(created_at_raw)
        human_uuid = msg.get("uuid") or ""
        attachments = msg.get("attachments") or []
        files = msg.get("files") or []
        if attachments or files:
            attachments_raw = json.dumps({"attachments": attachments, "files": files})
        else:
            attachments_raw = None

        # Collect all following assistant messages until next human
        answer_parts: list[str] = []
        i += 1
        while i < len(chat_messages):
            next_msg = chat_messages[i]
            next_sender = (next_msg.get("sender") or "").lower()
            if next_sender == "human":
                break
            if next_sender == "assistant":
                text = (next_msg.get("text") or "").strip()
                if text:
                    answer_parts.append(text)
            i += 1

        answer_plain = "\n\n".join(answer_parts) if answer_parts else ""
        # Skip pairs with no answer (optional: could still store question-only)
        if not answer_plain:
            continue
        pairs.append({
            "question": question,
            "created_at_raw": created_at_raw,
            "created_at": created_at,
            "answer_plain": answer_plain,
            "attachments_raw": attachments_raw,
            "human_message_uuid": human_uuid,
        })
    return pairs


def content_hash(conversation_uuid: str, human_message_uuid: str, answer_plain: str) -> str:
    """Stable hash for deduplication."""
    hasher = hashlib.sha256()
    hasher.update(conversation_uuid.encode("utf-8"))
    hasher.update(b"|")
    hasher.update(human_message_uuid.encode("utf-8"))
    hasher.update(b"|")
    hasher.update(answer_plain.encode("utf-8"))
    return hasher.hexdigest()


def parse_claude_json(
    path: Path,
    conn,
    *,
    limit: Optional[int] = None,
) -> int:
    """
    Stream the JSON array at path with ijson; for each conversation, extract
    Q&A pairs and insert into entries. Returns number of inserted rows.
    """
    path = Path(path)
    source_file = str(path)
    inserted = 0

    with open(path, "rb") as f:
        for conversation in ijson.items(f, "item"):
            conv_uuid = conversation.get("uuid") or ""
            chat_messages = conversation.get("chat_messages") or []
            for pair in extract_qa_pairs(chat_messages):
                if limit is not None and inserted >= limit:
                    return inserted
                answer_plain = pair["answer_plain"]
                answer_html = answer_plain  # Claude export is plain/markdown; store same for both
                ch = content_hash(conv_uuid, pair["human_message_uuid"], answer_plain)
                new_id = insert_entry(
                    conn,
                    agent="claude",
                    source_file=source_file,
                    question=pair["question"],
                    created_at_raw=pair["created_at_raw"],
                    created_at=pair["created_at"],
                    answer_plain=answer_plain,
                    answer_html=answer_html,
                    attachments_raw=pair["attachments_raw"],
                    content_hash=ch,
                )
                if new_id:
                    inserted += 1
    return inserted


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Parse Claude conversations.json export into SQLite database."
    )
    parser.add_argument(
        "--input",
        "-i",
        type=str,
        default="source/claude.json",
        help="Path to the conversations.json export (e.g. renamed to claude.json).",
    )
    parser.add_argument(
        "--db",
        type=str,
        default=str(DB_PATH_DEFAULT),
        help="Path to the SQLite database (ai.sqlite).",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=0,
        help="Maximum number of entries to import (<=0 = no limit).",
    )

    args = parser.parse_args()

    input_path = Path(args.input)
    if not input_path.exists():
        raise SystemExit(f"Input file not found: {input_path}")

    conn = get_connection(args.db)
    init_schema(conn)

    limit = args.limit if args.limit and args.limit > 0 else None

    inserted = parse_claude_json(input_path, conn, limit=limit)
    print(f"Inserted {inserted} Claude entries into {args.db}")


if __name__ == "__main__":
    main()
