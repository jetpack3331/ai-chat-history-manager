# How to export Claude data and use it with this project

This guide explains how to get your Claude conversation history via the official export and load it into the AI Chat History Manager.

## 1. Request an export from Claude

1. In the **Claude** app (web or desktop), open **Settings**.
2. Go to **Privacy**.
3. Use **Export data** (or similar option to request a data export).
4. Confirm the request. You will receive an **email** with a link to download your data.

## 2. Download and unpack the export

1. Use the link from the email to download the export.
2. You will get a **ZIP file**. Unzip it on your computer.
3. Inside the ZIP you will find **4 files**:
   - **conversations.json** – your chat history (this is what the importer uses)
   - memories.json
   - projects.json
   - users.json

Only **conversations.json** is needed for this project’s Claude importer.

## 3. Put the file into the `source/` folder

1. In this project, create or use the **`source/`** folder (at the root of the repo, next to `parsers/`, `ui/`, etc.).
2. **Move** (or copy) the file **conversations.json** from the unzipped export into **`source/`**.
3. **Rename it to:** **`claude.json`**  
   - If you name it `claude.json` and put it in `source/`, the default importer command will work without extra arguments.

**Example:**

- You have (after unzip): `conversations.json`
- Put it in the project as: **`source/claude.json`**

So the full path on your machine will look like:

```text
…/ai-chat-history-manager/source/claude.json
```

If you use a different name (e.g. `claude_2025.json`), you can still run the parser by passing the path explicitly:

```bash
python -m parsers.claude_parser --input source/claude_2025.json --db db/ai.sqlite
```

## 4. Run the importer

From the **project root**:

```bash
python -m parsers.claude_parser --input source/claude.json --db db/ai.sqlite
```

(Use `python3` instead of `python` if that’s what you have.)

To import only a limited number of records for testing (e.g. first 20):

```bash
python -m parsers.claude_parser --input source/claude.json --db db/ai.sqlite --limit 20
```

If you run the importer multiple times on the same export, existing records are detected via a content hash and are **not** duplicated. The parser streams the JSON file (using ijson) so large exports are handled without loading the entire file into memory. Then start the UI (see [README](README.md)) and use **Reload** to see your imported conversations.

### Run the importer inside Docker

If you run the app via Docker, run the parser inside the container like this:

```bash
docker compose run --rm ai-chat-history-manager \
  python -m parsers.claude_parser --input source/claude.json --db db/ai.sqlite
```

You can add `--limit 20` (or any number) for a test import.

---

**Privacy:** The `source/` folder is ignored by git (see `.gitignore`), so your Claude export never gets committed to the repository. It stays only on your machine.
