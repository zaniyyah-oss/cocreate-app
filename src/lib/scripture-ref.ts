/**
 * Helpers for reading chapter/verse info out of a free-text scripture
 * reference like "Genesis 1:1-5", "Gen 1", or "John 3:16, 17".
 */

export type ParsedRef = {
  /** Chapter number, when one could be found. */
  chapter: number | null;
  /** Raw verse portion as written, e.g. "1-5" or "16, 17". */
  verses: string | null;
  /** Individual verse numbers referenced (ranges expanded). */
  verseNumbers: number[];
};

const EMPTY: ParsedRef = { chapter: null, verses: null, verseNumbers: [] };

export function parseScriptureRef(ref: string | null | undefined): ParsedRef {
  if (!ref) return EMPTY;
  const text = ref.replace(/[–—]/g, "-").trim();
  if (!text) return EMPTY;

  // Chapter:verse(s)
  const cv = text.match(/(\d+)\s*:\s*([\d\s,\-]+)/);
  if (cv) {
    const chapter = Number(cv[1]);
    const verses = cv[2].replace(/\s+/g, "").replace(/,$/, "");
    return {
      chapter: Number.isFinite(chapter) ? chapter : null,
      verses: verses || null,
      verseNumbers: expandVerses(verses),
    };
  }

  // Chapter only — take the last standalone number (skips "1 John").
  const nums = text.match(/\d+/g);
  if (nums && nums.length > 0) {
    const last = Number(nums[nums.length - 1]);
    // "1 John" alone should not read as chapter 1.
    const trailing = /\d+\s*$/.test(text);
    if (trailing && Number.isFinite(last)) {
      return { chapter: last, verses: null, verseNumbers: [] };
    }
  }
  return EMPTY;
}

function expandVerses(raw: string): number[] {
  const out = new Set<number>();
  for (const part of raw.split(",")) {
    const seg = part.trim();
    if (!seg) continue;
    const range = seg.match(/^(\d+)-(\d+)$/);
    if (range) {
      const a = Number(range[1]);
      const b = Number(range[2]);
      if (Number.isFinite(a) && Number.isFinite(b) && b >= a && b - a < 200) {
        for (let i = a; i <= b; i++) out.add(i);
      }
      continue;
    }
    const n = Number(seg);
    if (Number.isFinite(n)) out.add(n);
  }
  return [...out].sort((a, b) => a - b);
}

/** "Genesis 1:1-5" style label from a book name plus a parsed reference. */
export function formatBookRef(bookName: string, ref: string | null | undefined): string {
  const { chapter, verses } = parseScriptureRef(ref);
  if (chapter == null) return bookName;
  return verses ? `${bookName} ${chapter}:${verses}` : `${bookName} ${chapter}`;
}
