import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useBibleBooks } from "@/components/BookTagger";
import { TopicPicker, useAllTopics, type TopicRow } from "@/components/TopicPicker";
import { parseScriptureRef } from "@/lib/scripture-ref";


export const Route = createFileRoute("/read/$abbr")({
  validateSearch: (search: Record<string, unknown>) => ({
    entry: typeof search.entry === "string" ? search.entry : undefined,
  }),
  head: ({ params }) => ({
    meta: [
      { title: `${params.abbr} — Your entries on CoCreate` },
      { name: "description", content: `Every devotional entry tagged to ${params.abbr}.` },
      { property: "og:title", content: `${params.abbr} — Your entries on CoCreate` },
      { property: "og:description", content: `Every devotional entry tagged to ${params.abbr}.` },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: BookDetail,
});

type Entry = {
  id: string;
  entry_date: string | null;
  entry_title: string | null;
  scripture_reference: string | null;
  scripture_text: string | null;
  topic_ids: string[] | null;
};

type Topic = TopicRow;

function fmtDate(d: string | null) {
  if (!d) return "";
  return new Date(d + "T00:00:00").toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function BookDetail() {
  const { abbr } = Route.useParams();
  const { entry: focusEntryId } = Route.useSearch();
  const qc = useQueryClient();
  const booksQ = useBibleBooks();
  const topicsQ = useAllTopics();
  const [filterTopicIds, setFilterTopicIds] = useState<string[]>([]);
  const [chapter, setChapter] = useState<number | null>(null);
  const [verse, setVerse] = useState<number | null>(null);

  const book = (booksQ.data ?? []).find((b) => b.abbreviation === abbr);
  const topicsById = useMemo(() => {
    const m = new Map<string, Topic>();
    for (const t of topicsQ.data ?? []) m.set(t.id, t);
    return m;
  }, [topicsQ.data]);

  const entriesQ = useQuery({
    queryKey: ["read-book-entries", abbr],
    queryFn: async () => {
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes?.user?.id;
      if (!uid) return [] as Entry[];
      const { data, error } = await supabase
        .from("devotional_entries")
        .select("id,entry_date,entry_title,scripture_reference,scripture_text,topic_ids,book_of_bible,books_of_bible,book_confirmed")
        .eq("user_id", uid)
        .eq("book_confirmed", true)
        .or(`books_of_bible.cs.{"${abbr}"},book_of_bible.eq.${abbr}`)
        .order("entry_date", { ascending: false });
      if (error) throw error;
      return ((data ?? []) as any[]).filter((e) => {
        const arr = Array.isArray(e.books_of_bible) ? e.books_of_bible : [];
        if (arr.length > 0) return arr.includes(abbr);
        return e.book_of_bible === abbr;
      }) as Entry[];
    },
  });

  const entries = entriesQ.data ?? [];
  const fullName = book?.full_name ?? abbr;

  const topicMatched = useMemo(() => {
    if (filterTopicIds.length === 0) return entries;
    return entries.filter((e) => {
      const ids = e.topic_ids ?? [];
      return filterTopicIds.every((tid) => ids.includes(tid));
    });
  }, [entries, filterTopicIds]);

  // Chapters present in the (topic-filtered) entries.
  const chapters = useMemo(() => {
    const s = new Set<number>();
    for (const e of topicMatched) {
      const c = parseScriptureRef(e.scripture_reference).chapter;
      if (c != null) s.add(c);
    }
    return [...s].sort((a, b) => a - b);
  }, [topicMatched]);

  const chapterMatched = useMemo(() => {
    if (chapter == null) return topicMatched;
    return topicMatched.filter(
      (e) => parseScriptureRef(e.scripture_reference).chapter === chapter
    );
  }, [topicMatched, chapter]);

  // Verses present within the selected chapter.
  const verses = useMemo(() => {
    if (chapter == null) return [] as number[];
    const s = new Set<number>();
    for (const e of chapterMatched) {
      for (const v of parseScriptureRef(e.scripture_reference).verseNumbers) s.add(v);
    }
    return [...s].sort((a, b) => a - b);
  }, [chapterMatched, chapter]);

  const visibleEntries = useMemo(() => {
    if (verse == null) return chapterMatched;
    return chapterMatched.filter((e) =>
      parseScriptureRef(e.scripture_reference).verseNumbers.includes(verse)
    );
  }, [chapterMatched, verse]);

  // Only show topics that at least one entry in this book uses.
  const availableTopics = useMemo(() => {
    const used = new Set<string>();
    entries.forEach((e) => (e.topic_ids ?? []).forEach((id) => used.add(id)));
    return (topicsQ.data ?? []).filter((t) => used.has(t.id));
  }, [entries, topicsQ.data]);



  return (
    <AppShell>
      <div style={{ background: "#FBF8ED", minHeight: "100vh", width: "100%" }}>
        <style>{`
          .rb-wrap{max-width:1280px;margin:0 auto;padding:28px 32px 96px;font-family:'Poppins',sans-serif;color:#20201C;}
          .rb-nav{display:flex;align-items:center;gap:14px;flex-wrap:wrap;}
          .rb-back{display:inline-flex;align-items:center;gap:6px;font-size:14px;color:#0F4A42;font-weight:800;text-decoration:none;background:#fff;border:1.5px solid #ECE4CE;border-radius:999px;padding:8px 14px;}
          .rb-back:hover{border-color:#FFAE00;color:#0a332d;}
          .rb-card.focus{border-color:#FFAE00;box-shadow:0 0 0 3px rgba(255,174,0,.18);}
          .rb-tag{
            display:inline-flex;align-items:center;margin:28px 0 14px;
            background:#FFAE00;color:#20201C;font-size:12px;font-weight:800;
            padding:8px 16px;border-radius:12px;letter-spacing:.08em;text-transform:uppercase;
          }
          .rb-h1{font-family:'Archivo Black','Poppins',sans-serif;font-size:56px;line-height:1;letter-spacing:-.02em;margin:6px 0 12px;color:#20201C;}
          .rb-count{font-size:15px;color:#6b6a60;margin-bottom:32px;}
          .rb-empty{
            background:#fff;border:1.5px dashed #ECE4CE;border-radius:16px;padding:44px 24px;
            text-align:center;color:#6b6a60;font-size:15px;max-width:640px;
          }
          .rb-list{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px;}
          @media (max-width:1024px){.rb-list{grid-template-columns:repeat(2,minmax(0,1fr));}}
          @media (max-width:700px){.rb-list{grid-template-columns:1fr;}}
          .rb-card{
            background:#fff;border:1.5px solid #ECE4CE;border-radius:16px;padding:20px 22px;
            display:flex;flex-direction:column;gap:10px;
          }
          .rb-card-top{display:flex;align-items:center;justify-content:space-between;gap:10px;}
          .rb-pills{display:flex;flex-wrap:wrap;gap:6px;}
          .rb-pill{
            font-size:11px;font-weight:800;padding:6px 12px;border-radius:999px;
            letter-spacing:.06em;text-transform:uppercase;
          }
          .rb-pill.daily{background:#DCE07A;color:#20201C;}
          .rb-pill.topic{background:#0F4A42;color:#fff;}
          .rb-focus{
            display:inline-flex;align-items:center;gap:6px;background:#fff;border:1.5px solid #ECE4CE;
            color:#4a4a44;font-size:12px;font-weight:700;padding:6px 12px;border-radius:999px;
            text-decoration:none;
          }
          .rb-focus:hover{border-color:#FFAE00;color:#20201C;}
          .rb-focus svg{width:12px;height:12px;}
          .rb-title{font-family:'Archivo Black','Poppins',sans-serif;font-size:20px;line-height:1.2;margin:4px 0 0;color:#20201C;}
          .rb-meta{font-size:13px;color:#8a8879;font-weight:600;}
          .rb-note{
            width:100%;min-height:96px;resize:vertical;border:1px solid transparent;background:#FBF8ED;
            border-radius:10px;padding:10px 12px;font-family:inherit;font-size:14px;line-height:1.55;color:#20201C;
            transition:border-color .15s ease;
          }
          .rb-note:hover{border-color:#ECE4CE;}
          .rb-note:focus{outline:none;border-color:#FFAE00;background:#fff;}
          .rb-note-lbl{font-size:10.5px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:#8a8879;margin-top:2px;}
          .rb-note-status{font-size:11px;color:#8a8879;height:14px;}
          .rb-topics{display:flex;flex-wrap:wrap;gap:6px;align-items:center;}
          .rb-topic-add{
            font-size:11px;font-weight:700;padding:5px 10px;border-radius:999px;
            border:1.5px dashed #ECE4CE;background:transparent;color:#8a8879;cursor:pointer;
          }
          .rb-topic-add:hover{border-color:#FFAE00;color:#20201C;}
          .rb-topic-picker{
            position:relative;
          }
          .rb-topic-menu{
            position:absolute;top:calc(100% + 6px);left:0;z-index:20;background:#fff;
            border:1.5px solid #ECE4CE;border-radius:12px;padding:8px;min-width:220px;max-height:280px;overflow:auto;
            box-shadow:0 8px 24px rgba(0,0,0,.08);
          }
          .rb-topic-opt{
            display:flex;align-items:center;justify-content:space-between;gap:8px;width:100%;
            padding:8px 10px;border-radius:8px;border:none;background:transparent;cursor:pointer;
            font-family:inherit;font-size:13px;color:#20201C;text-align:left;
          }
          .rb-topic-opt:hover{background:#FBF8ED;}
          .rb-topic-opt.on{background:#FFF4D6;font-weight:700;}
          .rb-chip-x{
            background:transparent;border:none;color:inherit;font-size:14px;cursor:pointer;
            padding:0 0 0 4px;line-height:1;
          }
          .rb-filter{display:flex;flex-wrap:wrap;align-items:center;gap:10px;margin:0 0 24px;}
          .rb-filter-lbl{font-size:11px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:#8a8879;}
          .rb-filter-chips{display:flex;flex-wrap:wrap;gap:6px;}
          .rb-fchip{font-size:11px;font-weight:800;padding:6px 12px;border-radius:999px;letter-spacing:.06em;text-transform:uppercase;border:1.5px solid #ECE4CE;background:#fff;color:#4a4a44;cursor:pointer;font-family:inherit;}
          .rb-fchip:hover{border-color:#FFAE00;color:#20201C;}
          .rb-fchip.on{background:#0F4A42;color:#fff;border-color:#0F4A42;}
          .rb-fchip.clear{border-style:dashed;color:#8a8879;text-transform:none;letter-spacing:0;}
        `}</style>

        <div className="rb-wrap">
          <div className="rb-nav">
            <Link to="/read" className="rb-back">‹ All books</Link>
            <Link to="/notes" className="rb-back">All studies</Link>
          </div>
          <div className="rb-tag">{abbr}</div>
          <h1 className="rb-h1">{fullName}</h1>
          <div className="rb-count">
            {entries.length === 0
              ? "0 studies"
              : `${entries.length} ${entries.length === 1 ? "study" : "studies"}`}
          </div>

          {availableTopics.length > 0 && (
            <div className="rb-filter">
              <span className="rb-filter-lbl">Filter by topic</span>
              <div className="rb-filter-chips">
                {availableTopics.map((t) => {
                  const on = filterTopicIds.includes(t.id);
                  return (
                    <button
                      key={t.id}
                      type="button"
                      className={`rb-fchip ${on ? "on" : ""}`}
                      onClick={() =>
                        setFilterTopicIds((cur) =>
                          cur.includes(t.id) ? cur.filter((x) => x !== t.id) : [...cur, t.id]
                        )
                      }
                    >
                      {t.display_name ?? t.name}
                    </button>
                  );
                })}
                {filterTopicIds.length > 0 && (
                  <button type="button" className="rb-fchip clear" onClick={() => setFilterTopicIds([])}>
                    Clear
                  </button>
                )}
              </div>
            </div>
          )}

          {chapters.length > 0 && (
            <div className="rb-filter">
              <span className="rb-filter-lbl">Chapter</span>
              <div className="rb-filter-chips">
                {chapters.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`rb-fchip ${chapter === c ? "on" : ""}`}
                    onClick={() => {
                      setVerse(null);
                      setChapter((cur) => (cur === c ? null : c));
                    }}
                  >
                    {abbr} {c}
                  </button>
                ))}
                {chapter != null && (
                  <button
                    type="button"
                    className="rb-fchip clear"
                    onClick={() => { setChapter(null); setVerse(null); }}
                  >
                    All chapters
                  </button>
                )}
              </div>
            </div>
          )}

          {chapter != null && verses.length > 0 && (
            <div className="rb-filter">
              <span className="rb-filter-lbl">Verse</span>
              <div className="rb-filter-chips">
                {verses.map((v) => (
                  <button
                    key={v}
                    type="button"
                    className={`rb-fchip ${verse === v ? "on" : ""}`}
                    onClick={() => setVerse((cur) => (cur === v ? null : v))}
                  >
                    v{v}
                  </button>
                ))}
                {verse != null && (
                  <button type="button" className="rb-fchip clear" onClick={() => setVerse(null)}>
                    All verses
                  </button>
                )}
              </div>
            </div>
          )}

          {entries.length === 0 ? (
            <div className="rb-empty">
              No studies yet in {fullName} — entries you tag will show up here.
            </div>
          ) : visibleEntries.length === 0 ? (
            <div className="rb-empty">No studies match the selected filters.</div>

          ) : (
            <div className="rb-list">
              {visibleEntries.map((e) => (
                <EntryCard
                  key={e.id}
                  entry={e}
                  topicsById={topicsById}
                  autoFocus={focusEntryId === e.id}
                  onChanged={() => qc.invalidateQueries({ queryKey: ["read-book-entries", abbr] })}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function EntryCard({
  entry,
  topicsById,
  onChanged,
  autoFocus = false,
}: {
  entry: Entry;
  topicsById: Map<string, Topic>;
  onChanged: () => void;
  autoFocus?: boolean;
}) {
  const [note, setNote] = useState(entry.scripture_text ?? "");
  const [topicIds, setTopicIds] = useState<string[]>(entry.topic_ids ?? []);
  const [status, setStatus] = useState<"" | "saving" | "saved" | "error">("");
  const saveTimer = useRef<number | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const noteRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!autoFocus) return;
    const t = window.setTimeout(() => {
      cardRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      noteRef.current?.focus();
    }, 100);
    return () => window.clearTimeout(t);
  }, [autoFocus]);

  const saveNote = async (val: string) => {
    setStatus("saving");
    const { error } = await supabase
      .from("devotional_entries")
      .update({ scripture_text: val })
      .eq("id", entry.id);
    setStatus(error ? "error" : "saved");
    if (!error) window.setTimeout(() => setStatus(""), 1500);
  };

  const scheduleSaveNote = (val: string) => {
    setNote(val);
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => saveNote(val), 700);
  };

  const saveTopics = async (next: string[]) => {
    setTopicIds(next);
    setStatus("saving");
    const { error } = await supabase
      .from("devotional_entries")
      .update({ topic_ids: next } as any)
      .eq("id", entry.id);
    setStatus(error ? "error" : "saved");
    if (!error) window.setTimeout(() => setStatus(""), 1500);
    onChanged();
  };

  const previewTopics = topicIds
    .map((id) => topicsById.get(id))
    .filter((t): t is Topic => !!t)
    .slice(0, 2);

  return (
    <div className={`rb-card${autoFocus ? " focus" : ""}`} ref={cardRef}>
      <div className="rb-card-top">
        <div className="rb-pills">
          <span className="rb-pill daily">Read</span>
          {previewTopics.map((t) => (
            <span key={t.id} className="rb-pill topic">
              {t.display_name ?? t.name}
            </span>
          ))}
        </div>
        <Link
          to="/devotionals/$id"
          params={{ id: "default" }}
          search={{ date: entry.entry_date ?? undefined } as any}
          className="rb-focus"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 8V4h4M20 8V4h-4M4 16v4h4M20 16v4h-4" />
          </svg>
          Focus
        </Link>
      </div>

      <h3 className="rb-title">
        {entry.entry_title || entry.scripture_reference || "Untitled study"}
      </h3>
      <div className="rb-meta">
        {fmtDate(entry.entry_date)}
        {entry.scripture_reference ? ` · ${entry.scripture_reference}` : ""}
      </div>

      <div className="rb-note-lbl">Read note</div>
      <textarea
        ref={noteRef}
        className="rb-note"
        value={note}
        placeholder="Add a note from your reading…"
        onChange={(e) => scheduleSaveNote(e.target.value)}
        onBlur={() => {
          if (saveTimer.current) {
            window.clearTimeout(saveTimer.current);
            saveTimer.current = null;
          }
          if ((entry.scripture_text ?? "") !== note) saveNote(note);
        }}
      />

      <TopicPicker value={topicIds} onChange={saveTopics} />

      <div className="rb-note-status">
        {status === "saving" && "Saving…"}
        {status === "saved" && "Saved"}
        {status === "error" && "Couldn't save"}
      </div>
    </div>
  );
}
