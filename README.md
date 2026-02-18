## AI Database UI (Next.js)

**Version 1.0.0-beta** — Beta release; feedback and issues are welcome.

**Why this repo exists.** Chat tools like Gemini, ChatGPT, and Claude are great for answers, but they make it hard to search or reuse your own history. You end up scrolling, losing old threads, or re-asking the same things. This project gives you a **local** copy of your AI conversations: you import exports (e.g. from Google Takeout), store them in a small database on your machine, and search **all of them in one place**—no matter whether the reply came from Gemini, OpenAI, Claude, or another agent. One search box, one history. Your data never leaves your computer, and you can find that tip, recipe, or code snippet from months ago in seconds.

**How to import data?** [Gemini](GEMINI.md) | [Claude](CLAUDE.md)

---

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
  - `claude_parser.py` – JSON → SQLite importer for Claude exports (`conversations.json`).
  - `reset_agent.py` – CLI tool to delete all rows for a given agent.
  - `config.json` – parser configuration (e.g. question prefix for Gemini).
- `source/`
  - Default location for import sources (e.g. `gemini.html` from Google Takeout, `claude.json` from Claude export).
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
- **Responsive layout**: entries as cards; expand to see full question and answer (side‑by‑side on desktop, stacked on small screens).
- **Answer in Markdown or plain text** – a toggle per entry.
- **List operations**:
  - expand/collapse each entry,
  - multi‑select: select all, clear selection,
  - **Delete** (physically delete from DB),
  - **Remove from view** (hide from current list, keep in DB).
- **Search & add results**:
  - a search input in the top bar searches both questions and answers,
  - results appear in an overlay with highlighted matches,
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

### Running the UI

From the project root:

```bash
cd ui
npm install
npm run dev
```

Open `http://localhost:3000` in your browser.

- If the database is empty, after the first load the page shows a short message (*No data yet.*).
  Import data using the Python importers (see [GEMINI.md](GEMINI.md) / [CLAUDE.md](CLAUDE.md)), then click **Reload** in the top bar.

---

### Resetting the DB for an agent

From the UI:

- In the **bottom bar**, choose an agent (All / Gemini / Claude).
- Click **Reset DB** and confirm the dialog. (Reset is disabled when “All” is selected.)

From the Python CLI (alternative):

```bash
python -m parsers.reset_agent --agent gemini
```

---

### Export to JSON

In the **bottom bar** click **Export JSON**:

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
- `./source` → `/app/source` (place your `gemini.html` and/or `claude.json` exports here),
- `./parsers/config.json` → `/app/parsers/config.json` (read‑only).

Your data and configuration stay on the host, the container just runs the
parser and UI. To run an importer inside the container, see [GEMINI.md](GEMINI.md) or [CLAUDE.md](CLAUDE.md) for the exact commands.

---

### Licensing

The whole project (including the UI) is licensed under MIT – free to use, modify and distribute (including commercial use).

