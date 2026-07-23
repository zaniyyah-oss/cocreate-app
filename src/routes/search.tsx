import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import type { Database } from "@/integrations/supabase/types";
import { z } from "zod";

export const Route = createFileRoute("/search")({
  component: SearchPage,
  validateSearch: z.object({ q: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Search — CoCreate" },
      { name: "description", content: "Search essays, teachings, podcasts, and more on CoCreate." },
      { property: "og:title", content: "Search — CoCreate" },
      { property: "og:description", content: "Search essays, teachings, podcasts, and more on CoCreate." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

type ContentPreview = Database["public"]["Views"]["content_items_public"]["Row"];
type ContentType = Database["public"]["Enums"]["content_type"];

const routeForType = (t: ContentType | null | undefined) =>
  t === "teaching" ? "/teachings/$id" : t === "podcast" ? "/podcasts/$id" : "/essays/$id";

const TYPE_LABEL: Record<string, string> = {
  teaching: "Teaching",
  podcast: "Podcast",
  essay: "Essay",
  blog: "Blog",
  clip: "Clip",
  promoted: "Featured",
};

const CSS = `
.search-root{font-family:'Poppins',sans-serif;background:#eee9d9;color:#20201c;min-height:100vh;}
.search-root *{box-sizing:border-box;}
.search-shell{max-width:1080px;margin:0 auto;padding:38px 28px 90px;}
.search-h1{font-size:34px;font-weight:900;letter-spacing:-0.03em;color:#181A4D;margin:0 0 18px;}

.search-form{max-width:560px;display:flex;gap:10px;margin-bottom:28px;}
.search-form input{flex:1;min-width:0;background:#fff;border:1px solid rgba(20,20,20,0.08);border-radius:12px;padding:12px 16px;font-family:'Poppins',sans-serif;font-size:14px;color:#181A4D;outline:none;}
.search-form input:focus{border-color:#181A4D;}
.search-form button{background:#181A4D;color:#fff;border:none;border-radius:12px;padding:12px 18px;font-family:'Poppins',sans-serif;font-weight:800;font-size:13px;cursor:pointer;}
.search-form button:hover{background:#2a2c66;}

.search-results{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:18px;}
.search-card{background:#fff;border-radius:14px;overflow:hidden;cursor:pointer;transition:transform .18s, box-shadow .18s;border:1px solid rgba(20,20,20,0.06);display:flex;flex-direction:column;position:relative;text-decoration:none;color:inherit;}
.search-card:hover{transform:translateY(-3px);box-shadow:0 14px 30px rgba(0,0,0,0.08);}
.search-thumb{width:100%;aspect-ratio:16/9;background:#181A4D;position:relative;overflow:hidden;}
.search-thumb img{width:100%;height:100%;object-fit:cover;}
.search-rt{position:absolute;top:10px;left:10px;font-size:9.5px;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;padding:4px 10px;border-radius:12px;background:#DCE07A;color:#181A4D;}
.search-cbody{padding:14px 16px 16px;}
.search-cbody h3{font-size:15px;font-weight:800;color:#181A4D;letter-spacing:-0.01em;margin:0 0 6px;line-height:1.35;}
.search-cbody .a{font-size:11.5px;color:#8a8678;font-weight:600;}
.search-empty{background:#fff;border:1.5px dashed rgba(20,20,20,0.12);border-radius:14px;padding:28px 24px;text-align:center;color:#8a8678;font-size:13.5px;line-height:1.6;}
.search-empty strong{display:block;color:#181A4D;font-weight:800;font-size:15px;margin-bottom:6px;}
.search-skel{background:#fff;border:1px solid rgba(20,20,20,0.06);border-radius:14px;height:240px;position:relative;overflow:hidden;}
.search-skel::after{content:'';position:absolute;inset:0;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.7),transparent);animation:search-shim 1.4s infinite;}
@keyframes search-shim{0%{transform:translateX(-100%);}100%{transform:translateX(100%);}}
.search-meta{font-size:13px;color:#8a8678;margin-bottom:20px;}
`;

function SearchPage() {
  const search = useSearch({ from: "/search" }) as { q?: string };
  const [query, setQuery] = useState(search.q ?? "");

  const resultsQ = useQuery({
    queryKey: ["search-content", search.q],
    enabled: !!search.q && search.q.trim().length > 0,
    queryFn: async () => {
      const term = `%${search.q!.trim()}%`;
      const { data, error } = await supabase
        .from("content_items_public")
        .select("*")
        .or(`title.ilike.${term},excerpt.ilike.${term}`)
        .order("published_at", { ascending: false, nullsFirst: false })
        .limit(24);
      if (error) throw error;
      return (data ?? []) as ContentPreview[];
    },
  });

  const items = resultsQ.data ?? [];
  const hasQuery = !!search.q && search.q.trim().length > 0;

  return (
    <AppShell current="home">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="search-root">
        <div className="search-shell">
          <h1 className="search-h1">Search</h1>
          <form className="search-form" action="/search" method="get">
            <input
              type="text"
              name="q"
              placeholder="Search teachings, podcasts, essays…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button type="submit">Search</button>
          </form>

          {hasQuery && (
            <div className="search-meta">
              {resultsQ.isLoading ? "Searching…" : `${items.length} result${items.length === 1 ? "" : "s"} for “${search.q}”`}
            </div>
          )}

          {hasQuery && resultsQ.isLoading ? (
            <div className="search-results">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="search-skel" />
              ))}
            </div>
          ) : hasQuery && items.length === 0 ? (
            <div className="search-empty">
              <strong>No results found</strong>
              Try a different keyword or browse the latest content on the homepage.
            </div>
          ) : hasQuery ? (
            <div className="search-results">
              {items.map((c) => (
                <Link
                  key={c.id}
                  to={routeForType(c.type) as any}
                  params={{ id: c.id! } as any}
                  className="search-card"
                >
                  <div className="search-thumb">
                    {c.thumbnail_url && <img src={c.thumbnail_url} alt={c.title ?? ""} />}
                    <span className="search-rt">{TYPE_LABEL[c.type ?? "essay"] ?? "Content"}</span>
                  </div>
                  <div className="search-cbody">
                    <h3>{c.title}</h3>
                    <div className="a">{c.author_name ?? "CoCreate"}</div>
                  </div>
                </Link>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </AppShell>
  );
}
