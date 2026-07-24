import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useBibleBooks } from "@/components/BookTagger";

export const Route = createFileRoute("/read")({
  head: () => ({
    meta: [
      { title: "Read — Your Bible library on CoCreate" },
      { name: "description", content: "Browse every book of the Bible you've studied. See what you've tagged, what's next, and drill into your entries by book." },
      { property: "og:title", content: "Read — Your Bible library on CoCreate" },
      { property: "og:description", content: "Browse every book of the Bible you've studied. See what you've tagged, what's next, and drill into your entries by book." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ReadLibrary,
});

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

function ReadLibrary() {
  const booksQ = useBibleBooks();
  const countsQ = useConfirmedCounts();
  const [tab, setTab] = useState<"OT" | "NT">("OT");

  const books = booksQ.data ?? [];
  const counts = countsQ.data ?? {};
  const studiedCount = useMemo(
    () => Object.entries(counts).filter(([, n]) => (n ?? 0) > 0).length,
    [counts]
  );
  const filtered = books.filter((b) => b.testament === tab);

  return (
    <AppShell>
      <style>{`
        .read-wrap{max-width:960px;margin:0 auto;padding:28px 20px 80px;font-family:'Poppins',sans-serif;color:#20201C;}
        .read-eyebrow{font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#FFAE00;}
        .read-h1{font-family:'Fraunces',serif;font-size:34px;line-height:1.15;margin:6px 0 6px;font-weight:600;}
        .read-sub{font-size:14px;color:#6b6a60;max-width:560px;}
        .read-stat{
          margin:24px 0 20px;background:#fff;border:1.5px solid #ECE4CE;border-radius:14px;
          padding:16px 20px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;
        }
        .read-stat .num{font-family:'Fraunces',serif;font-size:28px;font-weight:600;color:#0F4A42;}
        .read-stat .lbl{font-size:12.5px;color:#6b6a60;}
        .read-tabs{
          display:inline-flex;background:#F5EFD9;border-radius:999px;padding:4px;margin-bottom:18px;
        }
        .read-tabs button{
          border:none;background:transparent;padding:7px 18px;border-radius:999px;
          font-family:inherit;font-size:12.5px;font-weight:700;cursor:pointer;color:#6b6a60;
        }
        .read-tabs button.active{background:#181A4D;color:#fff;}
        .read-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:10px;}
        .read-chip{
          position:relative;display:flex;flex-direction:column;justify-content:space-between;
          padding:12px 12px 10px;border-radius:12px;border:1.5px solid #ECE4CE;background:#fff;
          text-decoration:none;color:#20201C;min-height:66px;
        }
        .read-chip:hover{border-color:#FFAE00;background:#fffdf5;}
        .read-chip.on{background:rgba(255,174,0,.12);border-color:#FFAE00;}
        .read-chip.off{opacity:.55;}
        .read-chip .abbr{font-family:'Fraunces',serif;font-size:16px;font-weight:600;line-height:1;}
        .read-chip .name{font-size:10.5px;color:#6b6a60;margin-top:4px;}
        .read-chip .badge{
          position:absolute;top:8px;right:8px;background:#FFAE00;color:#20201C;
          font-size:10px;font-weight:700;border-radius:999px;min-width:18px;height:18px;
          display:inline-flex;align-items:center;justify-content:center;padding:0 5px;
        }
      `}</style>
      <div className="read-wrap">
        <div className="read-eyebrow">Read</div>
        <h1 className="read-h1">Your Bible library</h1>
        <p className="read-sub">Every book you've studied lives here. Tap a book to revisit your entries.</p>

        <div className="read-stat">
          <div>
            <span className="num">{studiedCount}</span>
            <span className="lbl"> books studied out of 66</span>
          </div>
        </div>

        <div className="read-tabs" role="tablist">
          <button role="tab" className={tab === "OT" ? "active" : ""} onClick={() => setTab("OT")}>Old Testament</button>
          <button role="tab" className={tab === "NT" ? "active" : ""} onClick={() => setTab("NT")}>New Testament</button>
        </div>

        <div className="read-grid">
          {filtered.map((b) => {
            const n = counts[b.abbreviation] ?? 0;
            return (
              <Link
                key={b.abbreviation}
                to="/read/$abbr"
                params={{ abbr: b.abbreviation }}
                className={`read-chip ${n > 0 ? "on" : "off"}`}
              >
                <div>
                  <div className="abbr">{b.abbreviation}</div>
                  <div className="name">{b.full_name}</div>
                </div>
                {n > 0 && <span className="badge">{n}</span>}
              </Link>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
