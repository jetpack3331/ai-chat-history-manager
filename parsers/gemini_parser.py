import argparse
import hashlib
import json
import re
from datetime import datetime
from pathlib import Path
from typing import Optional

from bs4 import BeautifulSoup, NavigableString, Tag

from .db import DB_PATH_DEFAULT, get_connection, init_schema, insert_entry


TIMESTAMP_RE = re.compile(
    r"\d{1,2}\.\s*\d{1,2}\.\s*\d{4}\s+\d{1,2}:\d{2}:\d{2}",
    re.UNICODE,
)


def load_config() -> dict:
    """Load parsers configuration from config.json if present."""
    config_path = Path(__file__).with_name("config.json")
    if not config_path.exists():
        return {}
    try:
        return json.loads(config_path.read_text(encoding="utf-8"))
    except Exception:
        # On any error, fall back to empty config
        return {}


def normalize_question(raw_line: str, prefix: str) -> str:
    """Strip the configured prefix and non-breaking spaces, trim whitespace."""
    line = raw_line.replace("\xa0", " ").strip()
    lower = line.lower()
    lower_prefix = prefix.lower()
    if lower.startswith(lower_prefix):
        # Remove prefix in a case-insensitive way
        line = line[len(prefix) :].lstrip(" \xa0").strip()
    return line


def parse_timestamp(raw_line: str) -> tuple[str, Optional[str]]:
    """Return (created_at_raw, created_at_iso_or_none).

    Tries to convert the timestamp to ISO format; failures are ignored.
    """
    raw = raw_line.strip()

    # Attempt to parse Czech-like format, e.g. '12. 1. 2026 19:01:56 SEČ'
    # Timezone labels like 'SEČ'/'SELČ' are ignored for now.
    created_at_iso: Optional[str] = None

    # Strip potential timezone abbreviations at the end
    without_tz = re.sub(r"\s+(SEČ|SELČ)\s*$", "", raw)

    for fmt in ("%d. %m. %Y %H:%M:%S", "%d.%m.%Y %H:%M:%S"):
        try:
            dt = datetime.strptime(without_tz, fmt)
            created_at_iso = dt.strftime("%Y-%m-%d %H:%M:%S")
            break
        except ValueError:
            continue

    return raw, created_at_iso


def extract_lines_with_breaks(container: Tag) -> list[str]:
    """Convert the inner HTML into a list of 'lines' separated by <br> tags.

    Tags like <p>, <strong>, etc. are merged into the same logical line.
    """
    segments: list[tuple[str, Optional[str]]] = []

    for node in container.descendants:
        if isinstance(node, Tag) and node.name == "br":
            segments.append(("br", None))
        elif isinstance(node, NavigableString):
            text = str(node)
            if text:
                segments.append(("text", text))

    lines: list[str] = [""]
    for kind, value in segments:
        if kind == "br":
            lines.append("")
        else:
            assert value is not None
            lines[-1] += value

    # Normalize whitespace; keep even empty logical lines (caller may filter)
    return [line for line in (l.replace("\xa0", " ") for l in lines)]


def extract_answer_html(q_div: Tag, created_at_raw: str) -> str:
    """Cut out answer HTML that follows the timestamp.

    Strategy:
      - find the first occurrence of created_at_raw in the HTML,
      - find the first <br> AFTER that text,
      - everything after that <br> is answer_html.
    If created_at_raw is not found, returns the full inner HTML.
    """
    inner_html = q_div.decode_contents()
    # normalize non-breaking spaces in both strings
    html_normalized = inner_html.replace("\xa0", " ")
    ts_normalized = created_at_raw.replace("\xa0", " ")

    idx = html_normalized.find(ts_normalized)
    if idx == -1:
        return inner_html.strip()

    br_after_ts = html_normalized.find("<br", idx)
    if br_after_ts == -1:
        return inner_html.strip()

    end_br = html_normalized.find(">", br_after_ts)
    if end_br == -1:
        return inner_html.strip()

    # end_br is the index in html_normalized, but the strings share length
    answer_html = inner_html[end_br + 1 :].strip()
    return answer_html


def parse_gemini_html(path: Path, conn, *, limit: Optional[int] = None) -> int:
    """Parse Gemini HTML export and persist records into the database.

    Returns the number of inserted records.
    """
    html_text = path.read_text(encoding="utf-8")
    soup = BeautifulSoup(html_text, "lxml")

    outer_cells = soup.select(
        "div.outer-cell.mdl-cell.mdl-cell--12-col.mdl-shadow--2dp"
    )

    config = load_config()
    try:
        question_prefix = config["gemini"]["question_prefix"]
    except KeyError as exc:  # type: ignore[assignment]
        raise SystemExit(
            "Missing 'gemini.question_prefix' in parsers/config.json. "
            "Please configure the question prefix used in your Gemini export "
            "(for example: 'Pokyn', 'Prompt', ...)."
        ) from exc

    inserted = 0
    for outer in outer_cells:
        if limit is not None and limit > 0 and inserted >= limit:
            break

        # Main Q&A div (left column)
        q_div = outer.select_one(
            "div.content-cell.mdl-cell.mdl-cell--6-col.mdl-typography--body-1:not(.mdl-typography--text-right)"
        )
        if q_div is None:
            continue

        lines = extract_lines_with_breaks(q_div)
        if not lines:
            continue

        # Find the line containing the configured question prefix
        question_line_index = None
        for i, line in enumerate(lines):
            if question_prefix.lower() in line.lower():
                question_line_index = i
                break

        if question_line_index is None:
            # Could not identify a question; skip this block
            continue

        # Find the timestamp line after the question
        timestamp_index = None
        for i in range(question_line_index + 1, len(lines)):
            if TIMESTAMP_RE.search(lines[i]):
                timestamp_index = i
                break

        if timestamp_index is None:
            # Without a recognizable timestamp, skip to avoid mixing formats
            continue

        raw_question_line = lines[question_line_index]
        question = normalize_question(raw_question_line, question_prefix)

        created_at_raw, created_at_iso = parse_timestamp(lines[timestamp_index])

        answer_lines = lines[timestamp_index + 1 :]
        answer_plain = "\n".join(l.strip() for l in answer_lines).strip()

        if not question or not answer_plain:
            # Skip records without either question or answer
            continue

        # Prepare answer_html
        answer_html = extract_answer_html(q_div, created_at_raw)

        # Attachments (right column)
        attachments_div = outer.select_one(
            "div.content-cell.mdl-cell.mdl-cell--6-col.mdl-typography--body-1.mdl-typography--text-right"
        )
        attachments_raw = (
            attachments_div.decode_contents().strip() if attachments_div else None
        )

        # Build a deterministic hash for de-duplication so repeated imports
        # of the same HTML will not create duplicate rows.
        hasher = hashlib.sha256()
        hasher.update("gemini".encode("utf-8"))
        hasher.update(b"|")
        hasher.update(str(path).encode("utf-8"))
        hasher.update(b"|")
        hasher.update(question.encode("utf-8"))
        hasher.update(b"|")
        hasher.update(created_at_raw.encode("utf-8"))
        hasher.update(b"|")
        hasher.update(answer_plain.encode("utf-8"))
        content_hash = hasher.hexdigest()

        new_id = insert_entry(
            conn,
            agent="gemini",
            source_file=str(path),
            question=question,
            created_at_raw=created_at_raw,
            created_at=created_at_iso,
            answer_plain=answer_plain,
            answer_html=answer_html,
            attachments_raw=attachments_raw,
            content_hash=content_hash,
        )
        if new_id:
            inserted += 1

    return inserted


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Parse Gemini HTML export into SQLite database."
    )
    parser.add_argument(
        "--input",
        "-i",
        type=str,
        default="source/gemini.html",
        help="Path to the HTML export from Gemini.",
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
        help="Maximum number of items to parse (<=0 = no limit).",
    )

    args = parser.parse_args()

    input_path = Path(args.input)
    if not input_path.exists():
        raise SystemExit(f"Input file not found: {input_path}")

    conn = get_connection(args.db)
    init_schema(conn)

    limit = args.limit if args.limit and args.limit > 0 else None

    inserted = parse_gemini_html(input_path, conn, limit=limit)
    print(f"Inserted {inserted} Gemini entries into {args.db}")


if __name__ == "__main__":
    main()

