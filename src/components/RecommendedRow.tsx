import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type PreviewRow = Database["public"]["Views"]["content_items_public"]["Row"];
type ContentType = Database["public"]["Enums"]["content_type"];

const TYPE_META: Record<ContentType, { label: string; cls: string }> = {
  teaching: { label: "Teaching", cls: "teaching" },
  essay: { label: "Essay", cls: "essay" },
  podcast: { label: "Podcast", cls: "podcast" },
  blog: { label: "Blog", cls: "essay" },
};

const IMG_FALLBACK = (id: string) => `https://picsum.photos/seed/${id}/600/400`;

const CSS = `
.rf-wrap{margin:6px 0 34px;}
.rf-head{display:flex;align-items:baseline;justify-content:space-between;margin:0 0 12px;gap:12px;flex-wrap:wrap;}
.rf-lbl{font-size:10.5px;font-weight:800;letter-spacing:0.14em;text-transform:uppercase;color:#181A4D;margin:0;}
.rf-sub{font-size:12px;color:#8a8678;font-weight:600;margin:0;}
.rf-row{display:grid;grid-auto-flow:column;grid-auto-columns:minmax(240px, 1fr);gap:14px;overflow-x:auto;padding-bottom:8px;scroll-snap-type:x mandatory;scrollbar-width:thin;}
.rf-row::-webkit-scrollbar{height:6px;}
.rf-row::-webkit-scrollbar-thumb{background:rgba(20,20,20,0.14);border-radius:99px;}
@media (min-width:900px){.rf-row{grid-auto-columns:minmax(260px, 1fr);}}
.rf-card{background:#fff;border:1px solid rgba(20,20,20,0.06);border-radius:14px;overflow:hidden;cursor:pointer;display:flex;flex-direction:column;scroll-snap-align:start;transition:transform .18s ease, box-shadow .18s ease;}
.rf-card:hover{transform:translateY(-3px);box-shadow:0 14px 30px rgba(0,0,0,0.06);}
.rf-thumb{position:relative;aspect-ratio:16/10;overflow:hidden;background:#DCE07A;}
.rf-thumb img{width:100%;height:100%;object-fit:cover;display:block;filter:grayscale(.15) contrast(1.05);}
.rf-thumb::after{content:'';position:absolute;inset:0;mix-blend-mode:multiply;opacity:0.4;}
.rf-thumb.teaching::after{background:#FFAE00;}
.rf-thumb.essay::after,.rf-thumb.blog::after{background:#DCE07A;}
.rf-thumb.podcast::after{background:#0F4A42;}
.rf-tag{position:absolute;top:9px;left:9px;font-size:9.5px;font-weight:800;letter-spacing:0.05em;text-transform:uppercase;padding:3px 9px;border-radius:12px;background:#fff;color:#181A4D;}
.rf-body{padding:12px 14px 14px;display:flex;flex-direction:column;gap:4px;}
.rf-scr{font-size:10px;color:#0F4A42;font-weight:700;}
.rf-title{font-size:14.5px;font-weight:800;color:#181A4D;letter-spacing:-0.01em;line-height:1.3;margin:0;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}
.rf-skel{background:#fff;border-radius:14px;height:220px;animation:rf-pulse 1.4s infinite;border:1px solid rgba(20,20,20,0.05);}
@keyframes rf-pulse{0%,100%{opacity:1}50%{opacity:.55}}
`;

export function RecommendedRow() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUserId(data.session?.user.id ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setUserId(s?.user.id ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  const q = useQuery({
    queryKey: ["recommended-for-you", userId],
    enabled: userId !== undefined,
    queryFn: async (): Promise<{ items: PreviewRow[]; personalized: boolean }> => {
      let ids: string[] = [];
      let personalized = false;

      if (userId) {
        const { data: rec } = await (supabase.from as any)("user_recommendations")
          .select("content_ids, is_cold_start")
          .eq("user_id", userId)
          .maybeSingle();
        if (rec?.content_ids?.length) {
          ids = rec.content_ids as string[];
          personalized = !rec.is_cold_start;
        }
      }

      if (ids.length === 0) {
        const { data: pop } = await (supabase.rpc as any)("get_popular_content_ids", { _limit: 8 });
        ids = (pop as string[] | null) ?? [];
      }

      if (ids.length === 0) return { items: [], personalized: false };

      const { data } = await supabase
        .from("content_items_public")
        .select("*")
        .in("id", ids);

      const byId = new Map<string, PreviewRow>();
      (data ?? []).forEach((c) => { if (c.id) byId.set(c.id, c as PreviewRow); });
      const ordered = ids.map((i) => byId.get(i)).filter((x): x is PreviewRow => !!x);
      return { items: ordered.slice(0, 8), personalized };
    },
  });

  if (q.isLoading) {
    return (
      <>
        <style dangerouslySetInnerHTML={{ __html: CSS }} />
        <div className="rf-wrap">
          <div className="rf-head"><h2 className="rf-lbl">Recommended for you</h2></div>
          <div className="rf-row">
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="rf-skel" />)}
          </div>
        </div>
      </>
    );
  }

  const items = q.data?.items ?? [];
  if (items.length === 0) return null;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="rf-wrap">
        <div className="rf-head">
          <h2 className="rf-lbl">Recommended for you</h2>
          <p className="rf-sub">
            {q.data?.personalized ? "Based on what you've been engaging with" : "Popular across CoCreate right now"}
          </p>
        </div>
        <div className="rf-row">
          {items.map((c) => {
            const t = (c.type ?? "essay") as ContentType;
            const meta = TYPE_META[t];
            const route = t === "teaching" ? "/teachings/$id" : t === "podcast" ? "/podcasts/$id" : "/essays/$id";
            return (
              <div key={c.id ?? ""} className="rf-card" onClick={() => c.id && navigate({ to: route, params: { id: c.id } })}>
                <div className={`rf-thumb ${meta.cls}`}>
                  <img src={c.thumbnail_url || IMG_FALLBACK(c.id ?? "x")} alt={c.title ?? ""} loading="lazy" />
                  <span className="rf-tag">{meta.label}</span>
                </div>
                <div className="rf-body">
                  {c.scripture_reference && <div className="rf-scr">{c.scripture_reference}</div>}
                  <h3 className="rf-title">{c.title}</h3>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
