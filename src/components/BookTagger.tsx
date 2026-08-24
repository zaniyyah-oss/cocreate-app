import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { Database } from "@/integrations/supabase/types";

export type BibleBook = Database["public"]["Tables"]["bible_books"]["Row"];
export type BookSource = "manual" | "auto" | null;

export function useBibleBooks() {
  return useQuery({
    queryKey: ["bible-books"],
    staleTime: 24 * 60 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bible_books")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as BibleBook[];
    },
  });
}

type Props = {
  values: string[];
  suggestion?: string | null;
  disabled?: boolean;
  onToggle: (abbr: string) => void;
  onConfirmSuggestion?: () => void;
  /** Compact presentation: a single quiet icon button, no chips or helper rows. */
  iconOnly?: boolean;
};

export function BookTagger({ values, suggestion, disabled, onToggle, onConfirmSuggestion, iconOnly }: Props) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const booksQ = useBibleBooks();
  const books = booksQ.data ?? [];


  const byAbbr = useMemo(() => {
    const m = new Map<string, BibleBook>();
    for (const b of books) m.set(b.abbreviation, b);
    return m;
  }, [books]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return books;
    return books.filter(
      (b) => b.abbreviation.toLowerCase().includes(term) || b.full_name.toLowerCase().includes(term)
    );
  }, [books, q]);
  const ot = filtered.filter((b) => b.testament === "OT");
  const nt = filtered.filter((b) => b.testament === "NT");

  const hasValues = values.length > 0;
  const showSuggestion = !hasValues && !!suggestion;
  const state: "empty" | "suggested" | "confirmed" = showSuggestion
    ? "suggested"
    : hasValues
    ? "confirmed"
    : "empty";

  const chevron = (
    <svg className="bt-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9l6 6 6-6" />
    </svg>
  );

  const trigger = iconOnly ? (
    <button
      type="button"
      className={`bt-icon${values.length > 0 ? " on" : ""}`}
      disabled={disabled}
      title="Add a book of the Bible"
      aria-label="Add a book of the Bible"
      onClick={() => setOpen((v) => !v)}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      </svg>
    </button>
  ) : (
    <button
      type="button"
      className={`bt-select bt-${state}`}
      disabled={disabled}
      onClick={() => setOpen((v) => !v)}
    >
      <span className="bt-label">
        {state === "empty"
          ? "+ Add book of the Bible"
          : state === "suggested"
          ? byAbbr.get(suggestion!)?.full_name ?? suggestion
          : `${values.length} book${values.length === 1 ? "" : "s"} selected — add or change`}
      </span>
      {chevron}
    </button>
  );

  return (
    <div className={`book-tagger bt-${state}${iconOnly ? " bt-iconmode" : ""}`}>
      <style>{`
        .book-tagger{margin-bottom:12px;font-family:'Poppins',sans-serif;}
        .book-tagger.bt-iconmode{margin-bottom:0;display:inline-flex;}
        .bt-icon{display:inline-flex;align-items:center;justify-content:center;width:30px;height:30px;border:none;background:transparent;border-radius:8px;color:rgba(24,26,77,0.45);cursor:pointer;padding:0;}
        .bt-icon svg{width:17px;height:17px;}
        .bt-icon:hover{background:rgba(24,26,77,0.06);color:#181A4D;}
        .bt-icon.on{color:#181A4D;}
        .bt-icon:disabled{opacity:.4;cursor:not-allowed;}

        .bt-select{
          width:100%;display:flex;align-items:center;justify-content:space-between;gap:8px;
          background:#fff;border:1.5px dashed #cfc9b4;border-radius:10px;
          padding:9px 12px;cursor:pointer;font-family:inherit;color:#a39d87;
          font-size:12.5px;font-weight:600;text-align:left;
        }
        .bt-select:disabled{cursor:not-allowed;opacity:.7;}
        .bt-chev{width:13px;height:13px;flex-shrink:0;color:#a39d87;}
        .bt-suggested .bt-select{border:1.5px solid #FFAE00;background:rgba(255,174,0,.10);}
        .bt-suggested .bt-select .bt-label{color:#20201C;font-weight:700;}
        .bt-suggested .bt-chev{color:#8a7a4a;}
        .bt-confirmed .bt-select{border:1.5px solid #ECE4CE;background:#fff;}
        .bt-confirmed .bt-select .bt-label{color:#20201C;font-weight:700;}
        .bt-confirmed .bt-chev{color:#8a8879;}
        .bt-chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px;}
        .bt-chip{
          display:inline-flex;align-items:center;gap:6px;background:#0F4A42;color:#fff;
          font-size:11px;font-weight:700;padding:5px 10px;border-radius:999px;
        }
        .bt-chip button{
          background:transparent;border:none;color:#fff;opacity:.85;cursor:pointer;
          padding:0;line-height:1;font-size:14px;
        }
        .bt-chip button:hover{opacity:1;}
        .bt-suggest-row{
          display:flex;align-items:center;justify-content:space-between;gap:8px;
          margin-top:7px;font-size:10.5px;color:#8a7a4a;flex-wrap:wrap;
        }
        .bt-suggest-row .txt{display:inline-flex;align-items:center;gap:5px;}
        .bt-suggest-row svg{width:11px;height:11px;}
        .bt-actions{display:flex;gap:6px;}
        .bt-actions button{
          border:none;border-radius:7px;padding:4px 9px;font-size:10px;font-weight:700;
          cursor:pointer;font-family:'Poppins',sans-serif;
        }
        .bt-confirm{background:#0F4A42;color:#fff;}
        .bt-change{background:#fff;border:1.5px solid #E4DCC4;color:#6b6a60;}
        .bt-pop{
          width:300px;padding:10px;font-family:'Poppins',sans-serif;
          background:#fff !important;border:1.5px solid #ECE4CE;border-radius:12px;
          box-shadow:0 12px 32px rgba(20,20,20,.12);opacity:1;
        }
        .bt-pop input{
          width:100%;padding:8px 10px;border-radius:8px;border:1.5px solid #ECE4CE;
          font-family:inherit;font-size:12.5px;margin-bottom:10px;outline:none;background:#fff;
        }
        .bt-pop input:focus{border-color:#0F4A42;}
        .bt-pop .bt-hint{font-size:10.5px;color:#8a8879;padding:0 4px 8px;}
        .bt-pop .bt-group{margin-bottom:8px;}
        .bt-pop .bt-group h4{
          font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;
          color:#8a8879;margin:8px 4px 4px;
        }
        .bt-pop .bt-list{max-height:220px;overflow-y:auto;display:grid;grid-template-columns:repeat(3,1fr);gap:4px;}
        .bt-pop .bt-list button{
          border:1px solid #ECE4CE;background:#fff;border-radius:7px;padding:6px 4px;
          font-family:inherit;font-size:11.5px;font-weight:600;color:#20201C;cursor:pointer;
          display:inline-flex;align-items:center;justify-content:center;gap:4px;
        }
        .bt-pop .bt-list button:hover{background:#F5EFD9;border-color:#FFAE00;}
        .bt-pop .bt-list button[aria-pressed="true"]{background:#0F4A42;border-color:#0F4A42;color:#fff;}
        .bt-pop .bt-list button[aria-pressed="true"]:hover{background:#0a332d;}
        .bt-pop .bt-empty{padding:12px;text-align:center;font-size:12px;color:#8a8879;}
        .bt-pop .bt-done{margin-top:8px;width:100%;background:#181A4D;color:#fff;border:none;border-radius:8px;padding:8px 10px;font-family:inherit;font-size:12px;font-weight:700;cursor:pointer;}
        .bt-pop .bt-done:hover{background:#0F4A42;}
        .bt-confirmed-row{
          display:flex;align-items:center;gap:5px;margin-top:7px;
          font-size:10.5px;color:#0F4A42;font-weight:600;
        }
        .bt-confirmed-row svg{width:11px;height:11px;}
      `}</style>

      <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setQ(""); }}>
        <PopoverTrigger asChild>{trigger}</PopoverTrigger>
        <PopoverContent align="start" className="bt-pop">
          <input
            autoFocus
            placeholder="Search books…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <div className="bt-hint">Select one or more books — this note will show up under each.</div>
          {filtered.length === 0 ? (
            <div className="bt-empty">No matching book</div>
          ) : (
            <>
              {ot.length > 0 && (
                <div className="bt-group">
                  <h4>Old Testament</h4>
                  <div className="bt-list">
                    {ot.map((b) => {
                      const on = values.includes(b.abbreviation);
                      return (
                        <button
                          key={b.abbreviation}
                          aria-pressed={on}
                          onClick={() => onToggle(b.abbreviation)}
                          title={b.full_name}
                        >
                          {on && "✓"} {b.abbreviation}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              {nt.length > 0 && (
                <div className="bt-group">
                  <h4>New Testament</h4>
                  <div className="bt-list">
                    {nt.map((b) => {
                      const on = values.includes(b.abbreviation);
                      return (
                        <button
                          key={b.abbreviation}
                          aria-pressed={on}
                          onClick={() => onToggle(b.abbreviation)}
                          title={b.full_name}
                        >
                          {on && "✓"} {b.abbreviation}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
          <button type="button" className="bt-done" onClick={() => { setOpen(false); setQ(""); }}>
            Done
          </button>
        </PopoverContent>
      </Popover>

      {hasValues && !iconOnly && (
        <div className="bt-chips">
          {values.map((abbr) => (
            <span key={abbr} className="bt-chip">
              {byAbbr.get(abbr)?.full_name ?? abbr}
              <button
                type="button"
                aria-label={`Remove ${abbr}`}
                onClick={() => onToggle(abbr)}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {state === "suggested" && !iconOnly && (

        <div className="bt-suggest-row">
          <span className="txt">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3v3M12 18v3M5 12H2M22 12h-3M6 6l2 2M16 16l2 2M6 18l2-2M16 8l2-2"/></svg>
            Detected from your entry
          </span>
          <span className="bt-actions">
            {onConfirmSuggestion && (
              <button type="button" className="bt-confirm" onClick={onConfirmSuggestion}>Confirm</button>
            )}
            <button type="button" className="bt-change" onClick={() => setOpen(true)}>Change</button>
          </span>
        </div>
      )}
    </div>
  );
}
