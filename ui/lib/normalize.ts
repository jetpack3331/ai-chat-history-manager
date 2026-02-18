/**
 * Normalize string for search matching: remove diacritics (NFD + strip
 * combining marks). Same logic as in parsers/normalize.py so FTS and
 * frontend snippet/highlight behave consistently.
 */
export function normalizeForMatch(s: string): string {
  if (!s) return s;
  return s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();
}

/** 1:1 character map for Czech + common Latin so indices stay aligned with original. */
const ACCENT_MAP: Record<string, string> = {
  á: "a", à: "a", â: "a", ä: "a", ã: "a", å: "a", ā: "a", ǎ: "a", ą: "a",
  Á: "a", À: "a", Â: "a", Ä: "a", Ã: "a", Å: "a", Ā: "a", Ǎ: "a", Ą: "a",
  é: "e", è: "e", ê: "e", ë: "e", ě: "e", ē: "e", ę: "e",
  É: "e", È: "e", Ê: "e", Ë: "e", Ě: "e", Ē: "e", Ę: "e",
  í: "i", ì: "i", î: "i", ï: "i", ī: "i", ǐ: "i",
  Í: "i", Ì: "i", Î: "i", Ï: "i", Ī: "i", Ǐ: "i",
  ó: "o", ò: "o", ô: "o", ö: "o", õ: "o", ō: "o", ǒ: "o", ø: "o",
  Ó: "o", Ò: "o", Ô: "o", Ö: "o", Õ: "o", Ō: "o", Ǒ: "o", Ø: "o",
  ú: "u", ù: "u", û: "u", ü: "u", ū: "u", ǔ: "u", ů: "u",
  Ú: "u", Ù: "u", Û: "u", Ü: "u", Ū: "u", Ǔ: "u", Ů: "u",
  ý: "y", ÿ: "y", ŷ: "y", ỳ: "y", Ý: "y", Ŷ: "y", Ỳ: "y",
  č: "c", ċ: "c", ç: "c", ć: "c", Č: "c", Ċ: "c", Ç: "c", Ć: "c",
  ď: "d", ḋ: "d", đ: "d", Ď: "d", Ḋ: "d", Đ: "d",
  ň: "n", ñ: "n", ņ: "n", ń: "n", Ň: "n", Ñ: "n", Ņ: "n", Ń: "n",
  ř: "r", ŕ: "r", ṙ: "r", Ř: "r", Ŕ: "r", Ṙ: "r",
  š: "s", ś: "s", ŝ: "s", ş: "s", Š: "s", Ś: "s", Ŝ: "s", Ş: "s",
  ť: "t", ṫ: "t", ŧ: "t", Ť: "t", Ṫ: "t", Ŧ: "t",
  ž: "z", ź: "z", ż: "z", Ž: "z", Ź: "z", Ż: "z",
};

/**
 * Normalize for snippet/highlight so that result has same length as input;
 * use for finding match index then slicing the original text.
 */
export function normalizePreserveLength(s: string): string {
  if (!s) return "";
  try {
    return s
      .split("")
      .map((c) => ACCENT_MAP[c] ?? c.toLowerCase())
      .join("");
  } catch {
    return s;
  }
}
