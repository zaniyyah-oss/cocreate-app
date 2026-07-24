import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useBibleBooks } from "@/components/BookTagger";

export const Route = createFileRoute("/read/$abbr")({
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

function BookDetail() {
  const { abbr } = Route.useParams();
  const booksQ = useBibleBooks();
  const book = (booksQ.data ?? []).find((b) => b.abbreviation === abbr);

  const entriesQ = useQuery({
    queryKey: ["read-book-entries", abbr],
    queryFn: async () => {
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes?.user?.id;
      if (!uid) return [] as Array<{ id: string; date_of_entry: string | null; scripture_reference: string | null; scripture_text: string | null }>;
      const { data, error } = await supabase
        .from("devotional_entries")
        .select("id,date_of_entry,scripture_reference,scripture_text,book_confirmed")
        .eq("user_id", uid)
        .eq("book_of_bible", abbr)
        .eq("book_confirmed", true)
        .order("date_of_entry", { ascending: false });
      if (error) throw error;
      return (data ?? []) as any;
    },
  });

  const entries = entriesQ.data ?? [];

  return (
    <AppShell>
      <style>{`
        .rb-wrap{max-width:820px;margin:0 auto;padding:28px 20px 80px;font-family:'Poppins',sans-serif;color:#20201C;}
        .rb-back{font-size:12.5px;color:#6b6a60;text-decoration:none;font-weight:600;}
        .rb-back:hover{color:#0F4A42;}
        .rb-tag{
          display:inline-flex;align-items:center;gap:6px;margin:14px 0 6px;
          background:rgba(255,174,0,.15);color:#20201C;font-size:10.5px;font-weight:700;
          padding:4px 10px;border-radius:999px;letter-spacing:.06em;text-transform:uppercase;
        }
        .rb-h1{font-family:'Fraunces',serif;font-size:34px;font-weight:600;margin:4px 0;}
        .rb-count{font-size:13px;color:#6b6a60;margin-bottom:22px;}
        .rb-empty{
          background:#fff;border:1.5px dashed #ECE4CE;border-radius:14px;padding:32px 20px;
          text-align:center;color:#6b6a60;font-size:13.5px;
        }
        .rb-list{display:grid;gap:10px;}
        .rb-card{
          background:#fff;border:1.5px solid #ECE4CE;border-radius:12px;padding:14px 16px;
          text-decoration:none;color:#20201C;display:block;
        }
        .rb-card:hover{border-color:#FFAE00;}
        .rb-date{font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#8a8879;}
        .rb-ref{font-family:'Fraunces',serif;font-size:16px;font-weight:600;margin:2px 0 4px;}
        .rb-snip{font-size:13px;color:#4a4a44;line-height:1.5;
          display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;
        }
      `}</style>
      <div className="rb-wrap">
        <Link to="/read" className="rb-back">← Back to Read</Link>
        <div className="rb-tag">Book of the Bible</div>
        <h1 className="rb-h1">{book?.full_name ?? abbr}</h1>
        <div className="rb-count">
          {entries.length === 0 ? "No entries yet" : `${entries.length} ${entries.length === 1 ? "study" : "studies"}`}
        </div>

        {entries.length === 0 ? (
          <div className="rb-empty">
            You haven't tagged any confirmed entries to {book?.full_name ?? abbr} yet.
          </div>
        ) : (
          <div className="rb-list">
            {entries.map((e) => (
              <Link
                key={e.id}
                to="/devotionals/$id"
                params={{ id: "default" }}
                search={{ date: e.date_of_entry ?? undefined } as any}
                className="rb-card"
              >
                <div className="rb-date">
                  {e.date_of_entry ? new Date(e.date_of_entry + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : ""}
                </div>
                {e.scripture_reference && <div className="rb-ref">{e.scripture_reference}</div>}
                {e.scripture_text && <div className="rb-snip">{e.scripture_text}</div>}
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
