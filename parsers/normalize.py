"""
Normalize string for search matching: remove diacritics (NFD + strip
combining marks). Same logic as ui/lib/normalize.ts so FTS and
frontend snippet/highlight behave consistently.
"""
import unicodedata


def normalize_for_match(s: str) -> str:
    if not s:
        return s
    nfd = unicodedata.normalize("NFD", s)
    without_marks = "".join(c for c in nfd if not unicodedata.combining(c))
    return without_marks.lower()
