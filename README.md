## AI Database UI (Next.js)

**Version 1.0.0-beta** — Beta release; feedback and issues are welcome.

AI chat history manager • AI database • AI chat manager • AI log explorer • AI parser • Gemini history parser •
OpenAI chat archive • Claude chat archive • SQLite FTS search for AI conversations

This app is a Next.js/Tailwind UI on top of a local SQLite database that stores conversation history from AI agents (Gemini, OpenAI, Claude, …).  
Data is imported into the database by Python scripts in the project root; the UI is primarily for full‑text search and browsing.

If you prefer not to install anything locally and want to run everything in Docker, jump straight to the
[Docker support](#docker-support) section below.

---

### Project structure

- `parsers/`
  - `db.py` – SQLite schema (`entries` + FTS5 `entries_fts` + triggers, indexes, reset helper).
  - `gemini_parser.py` – HTML → SQLite importer for Gemini exports.
  - `reset_agent.py` – CLI tool to delete all rows for a given agent.
  - `config.json` – parser configuration (e.g. question prefix for Gemini).
- `source/`
  - Default location for HTML exports (e.g. `gemini.html` from Google Takeout / Activity).
- `db/`
  - Location of the SQLite file `ai.sqlite` (created automatically).
- `ui/`
  - Next.js/Tailwind app – the web UI.
- `examples/`
  - Example HTML exports (`examples/gemini.html`) you can use to try the tool without a real Gemini export.

---

### Features

- **Display of recent entries** (by default the latest 10 by `created_at`).
- **Full‑text search** across questions and answers (SQLite FTS5).
- **Split layout**:
  - desktop: question on the left, answer on the right (50/50),
  - mobile: question and answer stacked vertically.
- **Answer in Markdown or plain text** – a toggle per entry.
- **List operations**:
  - expand/collapse each entry,
  - multi‑select: select all, clear selection,
  - **Delete** (physically delete from DB),
  - **Remove from view** (hide from current list, keep in DB).
- **Search & pinning results**:
  - a single search input searches both questions and answers,
  - results highlight the matched text,
  - clicking a result adds that entry to the top of the main list.
- **Reset DB for a chosen agent** – delete all records for `gemini` / `openai` / `claude`.
- **Export to JSON** – filtered by agent and optional full‑text query.

---

### Prerequisites

- Node.js (recommended: current LTS).
- Python 3 and installed parser dependencies:

```bash
pip install -r requirements.txt
```

> On some systems you may need to use `python3` / `pip3` instead of `python` / `pip`.

---

### First database import (Gemini)

In the project root there is a Python parser for the Gemini HTML export (`source/gemini.html`).

To import **all** records (recommended for normal use):

```bash
python -m parsers.gemini_parser --input source/gemini.html --db db/ai.sqlite
```

To import only a limited number of records for testing (e.g. first 20):

```bash
python -m parsers.gemini_parser --input source/gemini.html --db db/ai.sqlite --limit 20
```

If you run the importer multiple times on the same HTML export, existing
records are detected via a content hash and are **not** duplicated.

#### Parser configuration (`parsers/config.json`)

Before running the Gemini importer, you must configure how the parser
recognises the start of a user question.

The file `parsers/config.json` looks like this by default:

```json
{
  "gemini": {
    "question_prefix": "Pokyn"
  }
}
```

- `question_prefix` must match the text that appears at the beginning of
  each question in your Gemini export (for example `Pokyn` in Czech or
  `Prompt` in English).
- If `gemini.question_prefix` is missing, the importer will exit with an
  explicit error asking you to configure it.

Example for an English export where questions start with `Prompt`:

```json
{
  "gemini": {
    "question_prefix": "Prompt"
  }
}
```

#### Using the example Gemini file

If you just want to try the tool quickly without downloading your own
Gemini export, you can use the example file:

- `examples/gemini.html`

Either:

- copy it into `source/gemini.html`, or
- point the importer to it explicitly:

```bash
python -m parsers.gemini_parser --input examples/gemini.html --db db/ai.sqlite
```

---

### Running the UI

From the project root:

```bash
cd ui
npm install
npm run dev
```

Open `http://localhost:3000` in your browser.

- If the database is empty, the home page will show information with an example command
  for running the Python importer.
- After importing, click **“Reload”** in the top menu.

---

### Resetting the DB for an agent

From the UI:

- Select an agent (e.g. `gemini`) in the dropdown in the top toolbar.
- Click **“Reset DB”** and confirm the dialog.

From the Python CLI (alternative):

```bash
python -m parsers.reset_agent --agent gemini
```

---

### Export to JSON

In the top toolbar click **“Export JSON”**:

- if an agent is selected, only records for that agent are exported,
- if a full‑text query is also set, only the matching subset is exported.

The result is a downloaded `ai-export.json` file.

---

### Docker support

You can run both the Python parser and the Next.js UI inside Docker.

#### Build the image

From the project root:

```bash
docker compose build
```

#### Run the UI

```bash
docker compose up
```

Then open `http://localhost:3000` in your browser as usual.

The `docker-compose.yml` configuration mounts:

- `./db` → `/app/db` (SQLite file lives here),
- `./source` → `/app/source` (place your `gemini.html` export here),
- `./parsers/config.json` → `/app/parsers/config.json` (read‑only).

Your data and configuration stay on the host, the container just runs the
parser and UI.

#### Run the parser inside Docker

To run the Gemini importer inside the container (for example on a real
export you put into `source/gemini.html`):

```bash
docker compose run --rm ai-database \
  python -m parsers.gemini_parser --input source/gemini.html --db db/ai.sqlite
```

You can also pass `--limit` for test imports as before.

---

### Licensing

The whole project (including the UI) is licensed under MIT – free to use, modify and distribute (including commercial use).

