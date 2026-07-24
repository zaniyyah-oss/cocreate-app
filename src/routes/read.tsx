import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useBibleBooks } from "@/components/BookTagger";
import { useAllTopics } from "@/components/TopicPicker";

export const Route = createFileRoute("/read")({
  head: () => ({
    meta: [
      { title: "Read — Your Bible library on CoCreate" },
      { name: "description", content: "Every study you've saved, grouped by book of the Bible." },
      { property: "og:title", content: "Read — Your Bible library on CoCreate" },
      { property: "og:description", content: "Every study you've saved, grouped by book of the Bible." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ReadLibrary,
});

type RecentEntry = {
  id: string;
  entry_date: string | null;
  entry_title: string | null;
  scripture_reference: string | null;
  scripture_text: string | null;
  book_of_bible: string | null;
  topic_ids: string[] | null;
};


function useConfirmedCounts() {
  return useQuery({
    queryKey: ["read-confirmed-counts"],
    queryFn: async () => {
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes?.user?.id;
      if (!uid) return {} as Record<string, number>;
      const { data, error } = await supabase
        .from("devotional_entries")
        .select("book_of_bible")
        .eq("user_id", uid)
        .eq("book_confirmed", true)
        .not("book_of_bible", "is", null);
      if (error) throw error;
      const counts: Record<string, number> = {};
      for (const row of data ?? []) {
        const k = (row as any).book_of_bible as string | null;
        if (!k) continue;
        counts[k] = (counts[k] ?? 0) + 1;
      }
      return counts;
    },
    staleTime: 30_000,
  });
}

function useRecentStudies() {
  return useQuery({
    queryKey: ["read-recent-studies"],
    queryFn: async () => {
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes?.user?.id;
      if (!uid) return [] as RecentEntry[];
      const { data, error } = await supabase
        .from("devotional_entries")
        .select("id,entry_date,entry_title,scripture_reference,scripture_text,book_of_bible,book_confirmed,topic_ids")
        .eq("user_id", uid)
        .eq("book_confirmed", true)
        .not("book_of_bible", "is", null)
        .order("entry_date", { ascending: false })
        .limit(60);
      if (error) throw error;
      return (data ?? []) as RecentEntry[];
    },
    staleTime: 30_000,
  });
}

function ReadLibrary() {
  const booksQ = useBibleBooks();
  const countsQ = useConfirmedCounts();
  const recentQ = useRecentStudies();
  const [tab, setTab] = useState<"OT" | "NT">("OT");

  const books = booksQ.data ?? [];
  const counts = countsQ.data ?? {};
  const recent = recentQ.data ?? [];
  const studiedCount = useMemo(
    () => Object.entries(counts).filter(([, n]) => (n ?? 0) > 0).length,
    [counts]
  );
  const filtered = books.filter((b) => b.testament === tab);
  const totalForTab = filtered.length;

  const fmtDate = (d: string | null) =>
    d ? new Date(d + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "";

  return (
    <AppShell>
      <div style={{ background: "#FBF8ED", minHeight: "100vh", width: "100%" }}>
      <style>{`
        .rd-wrap{
          max-width:1280px;margin:0 auto;padding:28px 32px 96px;
          font-family:'Poppins',sans-serif;color:#20201C;
        }
        .rd-topbar{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;margin-bottom:36px;}
        .rd-tabs{
          display:inline-flex;background:#fff;border-radius:999px;padding:5px;
          border:1.5px solid #ECE4CE;
        }
        .rd-tabs button{
          border:none;background:transparent;padding:11px 26px;border-radius:999px;
          font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;color:#6b6a60;
          transition:all .15s ease;
        }
        .rd-tabs button.active{background:#181A4D;color:#fff;}
        .rd-allstudies{
          display:inline-flex;align-items:center;gap:8px;color:#0F4A42;
          font-size:14px;font-weight:700;text-decoration:none;
        }
        .rd-allstudies:hover{color:#0a332d;}

        .rd-eyebrow{
          font-size:12px;font-weight:800;letter-spacing:.18em;text-transform:uppercase;color:#0F4A42;
          margin-bottom:14px;
        }
        .rd-h1{
          font-family:'Archivo Black','Poppins',sans-serif;font-weight:900;
          font-size:64px;line-height:1;letter-spacing:-.02em;margin:0 0 20px;color:#20201C;
        }
        .rd-sub{font-size:16px;line-height:1.5;color:#4a4a44;max-width:640px;margin:0 0 28px;}

        .rd-stat{
          display:inline-flex;align-items:center;gap:18px;background:#fff;
          border:1.5px solid #ECE4CE;border-radius:14px;padding:16px 22px;margin-bottom:44px;
        }
        .rd-stat .num{
          font-family:'Archivo Black','Poppins',sans-serif;font-size:42px;line-height:1;
          color:#0F4A42;font-weight:900;
        }
        .rd-stat .lbl{font-size:14px;line-height:1.3;color:#4a4a44;max-width:120px;}

        .rd-section-label{
          font-size:12px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:#8a8879;
          margin:0 0 14px;
        }

        .rd-grid{
          display:grid;grid-template-columns:repeat(13,minmax(0,1fr));gap:10px;margin-bottom:56px;
        }
        @media (max-width:1024px){.rd-grid{grid-template-columns:repeat(8,minmax(0,1fr));}}
        @media (max-width:640px){.rd-grid{grid-template-columns:repeat(4,minmax(0,1fr));}}

        .rd-chip{
          position:relative;display:flex;align-items:center;justify-content:center;
          padding:16px 8px;border-radius:12px;border:1.5px solid #ECE4CE;background:#fff;
          text-decoration:none;color:#8a8879;font-size:14px;font-weight:700;
          transition:all .15s ease;min-height:52px;
        }
        .rd-chip:hover{border-color:#FFAE00;color:#20201C;}
        .rd-chip.on{
          background:#FFF4D6;border-color:#FFAE00;color:#20201C;
        }
        .rd-chip.on:hover{background:#FFEBB8;}
        .rd-badge{
          position:absolute;top:-6px;right:-6px;background:#DCE07A;color:#181A4D;
          font-size:10px;font-weight:800;border-radius:999px;min-width:20px;height:20px;
          display:inline-flex;align-items:center;justify-content:center;padding:0 5px;
          border:2px solid #FBF8ED;
        }

        .rd-recent-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px;}
        @media (max-width:900px){.rd-recent-grid{grid-template-columns:1fr;}}
        .rd-card{
          background:#fff;border:1.5px solid #ECE4CE;border-radius:16px;padding:20px 22px;
          text-decoration:none;color:#20201C;display:flex;flex-direction:column;gap:12px;
          transition:border-color .15s ease;
        }
        .rd-card:hover{border-color:#FFAE00;}
        .rd-card-top{display:flex;align-items:center;justify-content:space-between;}
        .rd-pill{
          background:#FFAE00;color:#20201C;font-size:11px;font-weight:800;
          padding:6px 14px;border-radius:999px;letter-spacing:.06em;text-transform:uppercase;
        }
        .rd-focus{
          display:inline-flex;align-items:center;gap:6px;background:#fff;border:1.5px solid #ECE4CE;
          color:#4a4a44;font-size:12px;font-weight:700;padding:6px 12px;border-radius:999px;
        }
        .rd-focus svg{width:12px;height:12px;}
        .rd-card-title{
          font-family:'Archivo Black','Poppins',sans-serif;font-size:22px;font-weight:900;
          line-height:1.15;margin:4px 0 0;color:#20201C;
        }
        .rd-card-meta{font-size:13px;color:#8a8879;font-weight:600;}
        .rd-card-snip{
          font-size:14px;line-height:1.55;color:#4a4a44;
          display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;
        }
      `}</style>

      <div className="rd-wrap">
        <div className="rd-topbar">
          <div className="rd-tabs" role="tablist">
            <button role="tab" className={tab === "OT" ? "active" : ""} onClick={() => setTab("OT")}>Old Testament</button>
            <button role="tab" className={tab === "NT" ? "active" : ""} onClick={() => setTab("NT")}>New Testament</button>
          </div>
          <Link to="/notes" className="rd-allstudies">→ All studies</Link>
        </div>

        <div className="rd-eyebrow">Workspace · Read</div>
        <h1 className="rd-h1">Read</h1>
        <p className="rd-sub">
          Every study you've saved, grouped by book of the Bible. Click a book to see everything you've written on it.
        </p>

        <div className="rd-stat">
          <span className="num">{studiedCount}</span>
          <span className="lbl">books studied out of 66</span>
        </div>

        <div className="rd-section-label">
          {tab === "OT" ? "Old Testament" : "New Testament"} — {totalForTab} books
        </div>

        <div className="rd-grid">
          {filtered.map((b) => {
            const n = counts[b.abbreviation] ?? 0;
            return (
              <Link
                key={b.abbreviation}
                to="/read/$abbr"
                params={{ abbr: b.abbreviation }}
                className={`rd-chip ${n > 0 ? "on" : ""}`}
                title={b.full_name}
              >
                {b.abbreviation}
                {n > 0 && <span className="rd-badge">{n}</span>}
              </Link>
            );
          })}
        </div>

        {recent.length > 0 && (
          <>
            <div className="rd-section-label">Recently studied</div>
            <div className="rd-recent-grid">
              {recent.map((e) => (
                <Link
                  key={e.id}
                  to="/read/$abbr"
                  params={{ abbr: e.book_of_bible ?? "" }}
                  search={{ entry: e.id } as any}
                  className="rd-card"
                >
                  <div className="rd-card-top">
                    <span className="rd-pill">Read</span>
                    <span className="rd-focus">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                      Open note
                    </span>
                  </div>
                  <h3 className="rd-card-title">{e.entry_title || e.scripture_reference || "Untitled study"}</h3>
                  <div className="rd-card-meta">
                    {e.book_of_bible ?? ""}{e.entry_date ? ` · ${fmtDate(e.entry_date)}` : ""}
                  </div>
                  {e.scripture_text && <div className="rd-card-snip">{e.scripture_text}</div>}
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
      </div>
    </AppShell>
  );
}
