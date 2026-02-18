# How to export Gemini data and use it with this project

This guide explains how to get your Gemini chat history from Google Takeout and load it into the AI Chat History Manager.

## 1. Request an export from Google Takeout

Gemini data is not exported as a separate “Gemini” product in Takeout. You need to use **My Activity** and then narrow the export to Gemini only.

1. Open **[Google Takeout](https://takeout.google.com/)** and sign in with the Google account you use for Gemini.
2. Find **“My Activity”** in the product list and make sure it’s selected (or select it).
3. There is a button like **“All activity data is included”** (or “Include all activity data”). **Click that** to open the list of activity types.
4. **Deselect all** (e.g. “Deselect all” or “Select none”), then enable **only** **“Apps with Gemini”** (or “Gemini” / “Gemini app”, depending on the wording in your language).
5. Click **“Next step”**.
6. Choose how you want the export:
   - **Delivery method:** e.g. “Send download link via email” or “Add to Drive”.
   - **Frequency:** “Export once” is enough.
   - **File type:** if offered, choose a format that includes **HTML** (the parser in this project expects HTML).
7. Click **“Create export”**.

Google will prepare the export. You’ll get an email or a link when it’s ready (this can take from minutes to hours depending on how much data you have).

## 2. Download and unpack the export

1. Use the link from the email (or from Google Takeout / Drive) to download the export.
2. You’ll get one or more ZIP files. Unzip them on your computer.
3. Inside, under the **Takeout** folder there will be a file called **MyActivity.html**.

The exact path and name can vary; Google sometimes changes the structure. What matters is that you find the **HTML file** that contains your Gemini chat history in a readable form.

## 3. Put the file into the `source/` folder

1. In this project, create or use the **`source/`** folder (at the root of the repo, next to `parsers/`, `ui/`, etc.).
2. Copy the MyActivity.html HTML file into `source/`.
3. **Rename it to:** **`gemini.html`**  
   - If you name it `gemini.html` and put it in `source/`, the default importer command will work without extra arguments.

**Example (after unzip):**

- You have: `Takeout/My Activity/Gemini/Apps with Gemini/MyActivity.html`
- Copy it to: **`source/gemini.html`** (in the project root).

So the full path on your machine will look like:

```text
…/ai-chat-history-manager/source/gemini.html
```

If you use a different name (e.g. `gemini_2025.html`), you can still run the parser by passing the path explicitly:

```bash
python -m parsers.gemini_parser --input source/gemini_2025.html --db db/ai.sqlite
```

## 4. Configure the parser

The parser needs to know how your Gemini export marks the start of each **question** (e.g. “Pokyn” in Czech or “Prompt” in English). Edit **`parsers/config.json`** and set the right `question_prefix` for your language.

The file looks like this by default:

```json
{
  "gemini": {
    "question_prefix": "Pokyn"
  }
}
```

- `question_prefix` must match the text at the beginning of each question in your export (e.g. `Pokyn` in Czech or `Prompt` in English).
- If `gemini.question_prefix` is missing, the importer will exit with an error asking you to configure it.

Example for an English export where questions start with `Prompt`:

```json
{
  "gemini": {
    "question_prefix": "Prompt"
  }
}
```

## 5. Run the importer

From the **project root**:

```bash
python -m parsers.gemini_parser --input source/gemini.html --db db/ai.sqlite
```

(Use `python3` instead of `python` if that’s what you have.)

To import only a limited number of records for testing (e.g. first 20):

```bash
python -m parsers.gemini_parser --input source/gemini.html --db db/ai.sqlite --limit 20
```

If you run the importer multiple times on the same HTML export, existing records are detected via a content hash and are **not** duplicated. Then start the UI (see [README](README.md)) and use **Reload** to see your imported conversations.

### Using the example Gemini file

To try the tool without your own export, use **`examples/gemini.html`**: copy it to `source/gemini.html`, or run:

```bash
python -m parsers.gemini_parser --input examples/gemini.html --db db/ai.sqlite
```

### Run the importer inside Docker

If you run the app via Docker, run the parser inside the container like this:

```bash
docker compose run --rm ai-chat-history-manager \
  python -m parsers.gemini_parser --input source/gemini.html --db db/ai.sqlite
```

You can add `--limit 20` (or any number) for a test import.

---

**Privacy:** The `source/` folder is ignored by git (see `.gitignore`), so your Gemini export never gets committed to the repository. It stays only on your machine.
