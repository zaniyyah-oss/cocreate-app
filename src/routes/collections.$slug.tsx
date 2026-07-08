import { createFileRoute, Link, useNavigate, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/collections/$slug")({
  component: CollectionPage,
  errorComponent: ({ error }) => (
    <AppShell current="explore">
      <div style={{ padding: 40 }}>Something went wrong: {error.message}</div>
    </AppShell>
  ),
  notFoundComponent: () => (
    <AppShell current="explore">
      <div style={{ padding: 40 }}>Collection not found.</div>
    </AppShell>
  ),
  head: ({ params }) => ({
    meta: [
      { title: `Collection — ${params.slug} · CoCreate` },
      { name: "description", content: "A collection of teachings, podcasts, essays, blogs, and clips released together." },
    ],
  }),
});

type ContentPreview = Database["public"]["Views"]["content_items_public"]["Row"];
type ContentType = Database["public"]["Enums"]["content_type"];

const IMG_FALLBACK = (id: string) => `https://picsum.photos/seed/${id}/600/400`;
const routeForType = (t: ContentType) =>
  t === "teaching" ? "/teachings/$id" : t === "podcast" ? "/podcasts/$id" : "/essays/$id";

const fmtDur = (s: number | null | undefined) => {
  if (!s) return "";
  const m = Math.floor(s / 60), sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
};

const startedAgo = (iso: string | null) => {
  if (!iso) return "A collection";
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days < 7) return `A collection · started ${days <= 1 ? "this week" : days + " days ago"}`;
  const weeks = Math.floor(days / 7);
  return `A collection · started ${weeks} week${weeks === 1 ? "" : "s"} ago`;
};

const CSS = `
.col-root{--cream:#FBF8ED;--navy:#181A4D;--teal:#0F4A42;--limelight:#DCE07A;--amber:#FFAE00;--burgundy:#441B07;--blush:#E990A2;--ink:#20201C;--hair:rgba(24,26,77,0.12);padding:26px 20px 90px;max-width:1360px;margin:0 auto;width:100%;font-family:'Poppins',sans-serif;color:var(--ink);}
@media(min-width:900px){.col-root{padding:30px 44px 90px;}}
.col-crumb{font-size:13px;font-weight:600;color:var(--navy);opacity:0.55;margin-bottom:14px;}
.col-crumb b{opacity:1;}
.col-crumb a{color:inherit;text-decoration:none;}
.col-crumb a:hover{text-decoration:underline;}

.col-banner{position:relative;border-radius:16px;overflow:hidden;min-height:230px;margin-bottom:18px;background:linear-gradient(120deg,var(--navy),var(--teal));display:flex;align-items:flex-end;padding:26px 30px;background-size:cover;background-position:center;}
.col-banner::after{content:'';position:absolute;inset:0;background:linear-gradient(180deg,rgba(24,26,77,0.05),rgba(24,26,77,0.55));}
.col-banner .inner{position:relative;z-index:1;}
.col-eyebrow{color:var(--limelight);font-size:11.5px;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;margin-bottom:6px;}
.col-title{color:#fff;font-size:32px;font-weight:900;margin:0;letter-spacing:-0.01em;line-height:1.1;}
@media(min-width:900px){.col-title{font-size:40px;}}

.col-writeup{margin-bottom:22px;max-width:900px;}
.col-writeup p{font-size:14.5px;color:var(--ink);opacity:0.78;line-height:1.7;margin:0 0 10px;white-space:pre-wrap;}

.col-devoanchor{background:var(--navy);border-radius:14px;padding:22px 26px;display:flex;justify-content:space-between;align-items:center;gap:20px;margin-bottom:34px;flex-wrap:wrap;}
.col-devoanchor h4{color:var(--limelight);font-size:16px;font-weight:800;margin:0 0 6px;}
.col-devoanchor p{color:var(--cream);opacity:0.7;font-size:12.5px;margin:0;max-width:520px;line-height:1.5;}
.col-devoanchor .right{display:flex;flex-direction:column;align-items:flex-end;gap:8px;flex-shrink:0;}
.col-addbtn{background:var(--limelight);color:var(--navy);font-size:12px;font-weight:700;padding:9px 18px;border-radius:999px;white-space:nowrap;cursor:pointer;border:none;text-decoration:none;font-family:inherit;}
.col-seeinside{color:var(--cream);opacity:0.75;font-size:11.5px;font-weight:600;text-decoration:underline;cursor:pointer;background:none;border:none;font-family:inherit;}

.col-filterrow{display:flex;gap:8px;margin-bottom:32px;flex-wrap:wrap;}
.col-fchip{border:1px solid var(--hair);background:#fff;color:var(--navy);font-weight:600;font-size:12.5px;padding:7px 15px;border-radius:999px;cursor:pointer;font-family:inherit;}
.col-fchip.active{background:var(--navy);color:var(--cream);border-color:transparent;}

.col-weeksection{margin-bottom:38px;}
.col-weekhead{display:flex;align-items:baseline;gap:10px;margin-bottom:16px;}
.col-weeklabel{font-size:12px;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;color:var(--burgundy);}
.col-weekcount{font-size:12px;color:var(--ink);opacity:0.45;font-weight:600;}

.col-rowgrid{display:grid;grid-template-columns:repeat(2,1fr);gap:14px;}
@media(min-width:700px){.col-rowgrid{grid-template-columns:repeat(3,1fr);}}
@media(min-width:1000px){.col-rowgrid{grid-template-columns:repeat(4,1fr);gap:16px;}}

.col-piececard{background:#fff;border-radius:12px;overflow:hidden;border:1px solid var(--hair);display:flex;flex-direction:column;cursor:pointer;text-decoration:none;color:inherit;transition:transform 0.15s ease;}
.col-piececard:hover{transform:translateY(-2px);}
.col-piecethumb{height:120px;background-size:cover;background-position:center;position:relative;background-color:#eee;}
.col-ptag{position:absolute;top:9px;left:9px;font-size:9.5px;font-weight:700;letter-spacing:0.03em;text-transform:uppercase;padding:4px 9px;border-radius:5px;color:#fff;}
.col-ptag.podcast{background:var(--teal);}
.col-ptag.essay{background:var(--navy);}
.col-ptag.teaching{background:var(--amber);color:var(--navy);}
.col-ptag.blog{background:var(--burgundy);}
.col-ptag.clip{background:var(--limelight);color:var(--navy);}
.col-ptag.promoted{background:var(--amber);color:var(--navy);}
.col-piecebody{padding:13px 14px;flex:1;display:flex;flex-direction:column;}
.col-piecetitle{font-size:13.5px;font-weight:700;color:var(--navy);margin:0 0 4px;line-height:1.3;}
.col-piecemeta{font-size:10.5px;color:var(--ink);opacity:0.55;font-weight:600;margin-top:auto;}
.col-playdot{position:absolute;bottom:9px;right:9px;width:26px;height:26px;border-radius:50%;background:rgba(255,255,255,0.92);display:flex;align-items:center;justify-content:center;}

.col-soon{opacity:0.5;cursor:default;}
.col-soon:hover{transform:none;}
.col-soon .col-piecethumb{background:repeating-linear-gradient(45deg,rgba(24,26,77,0.05),rgba(24,26,77,0.05) 10px,transparent 10px,transparent 20px);display:flex;align-items:center;justify-content:center;}
.col-soon-label{font-size:11px;font-weight:600;color:var(--navy);}

.col-empty{padding:40px;text-align:center;color:var(--ink);opacity:0.55;font-size:14px;}
`;

type CItem = {
  id: string;
  position: number;
  layout_slot: string | null;
  release_week: number | null;
  release_at: string | null;
  content: ContentPreview | null;
};

const CHIP_TYPES: Array<{ key: string; label: string; match: (t: string | null) => boolean }> = [
  { key: "all", label: "All", match: () => true },
  { key: "teaching", label: "Teaching", match: (t) => t === "teaching" },
  { key: "podcast", label: "Podcast", match: (t) => t === "podcast" },
  { key: "essay", label: "Essay", match: (t) => t === "essay" },
  { key: "blog", label: "Blog", match: (t) => t === "blog" },
  { key: "clips", label: "Clips", match: (t) => t === "clip" || t === "promoted" },
];

function CollectionPage() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const [activeChip, setActiveChip] = useState("all");

  const [userId, setUserId] = useState<string | null>(null);
  const [addedLocal, setAddedLocal] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUserId(data.session?.user.id ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setUserId(s?.user.id ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  const q = useQuery({
    queryKey: ["collection-page", slug],
    queryFn: async () => {
      const { data: col } = await (supabase.from as any)("collections")
        .select("*")
        .eq("slug", slug)
        .eq("status", "published")
        .maybeSingle();
      if (!col) throw notFound();
      const { data: itemsData } = await (supabase.from as any)("collection_items")
        .select("id, position, layout_slot, release_week, release_at, content:content_items_public(*)")
        .eq("collection_id", col.id)
        .order("release_week", { ascending: true, nullsFirst: false })
        .order("position", { ascending: true });
      let template: { id: string; slug: string | null; title: string } | null = null;
      if (col.devotional_template_id) {
        const { data: t } = await (supabase.from as any)("devotional_templates")
          .select("id, slug, title")
          .eq("id", col.devotional_template_id)
          .maybeSingle();
        template = t ?? null;
      }
      return { collection: col, items: (itemsData ?? []) as CItem[], template };
    },
  });

  const addedQ = useQuery({
    queryKey: ["collection-devo-added", userId, q.data?.template?.id],
    enabled: !!userId && !!q.data?.template?.id,
    queryFn: async () => {
      const { data } = await (supabase.from as any)("saved_items")
        .select("id")
        .eq("user_id", userId!)
        .eq("devotional_template_id", q.data!.template!.id)
        .limit(1);
      return (data ?? []).length > 0;
    },
  });
  const isAdded = addedLocal || !!addedQ.data;

  const addToAbide = async () => {
    const tpl = q.data?.template;
    if (!tpl) return;
    if (!userId) { navigate({ to: "/auth" }); return; }
    await (supabase.from as any)("saved_items").upsert(
      { user_id: userId, devotional_template_id: tpl.id },
      { onConflict: "user_id,devotional_template_id" },
    );
    setAddedLocal(true);
  };

  const now = Date.now();

  const filtered = useMemo(() => {
    if (!q.data) return [] as CItem[];
    const chip = CHIP_TYPES.find((c) => c.key === activeChip);
    if (!chip || chip.key === "all") return q.data.items;
    if (chip.key === "devotional") return [];
    return q.data.items.filter((it) => chip.match(it.content?.type ?? null));
  }, [q.data, activeChip]);

  const grouped = useMemo(() => {
    const map = new Map<number, CItem[]>();
    for (const it of filtered) {
      const wk = it.release_week ?? 1;
      if (!map.has(wk)) map.set(wk, []);
      map.get(wk)!.push(it);
    }
    return Array.from(map.entries()).sort((a, b) => a[0] - b[0]);
  }, [filtered]);

  const counts = useMemo(() => {
    const out: Record<string, number> = { all: 0, teaching: 0, podcast: 0, essay: 0, blog: 0, clips: 0, devotional: 0 };
    if (!q.data) return out;
    for (const it of q.data.items) {
      out.all += 1;
      const t = it.content?.type ?? "";
      if (t === "clip" || t === "promoted") out.clips += 1;
      else if (t in out) out[t] += 1;
    }
    if (q.data.collection.devotional_template_id) { out.devotional = 1; out.all += 1; }
    return out;
  }, [q.data]);

  if (q.isLoading) {
    return (
      <AppShell current="explore">
        <style dangerouslySetInnerHTML={{ __html: CSS }} />
        <div className="col-root"><div className="col-empty">Loading…</div></div>
      </AppShell>
    );
  }
  if (!q.data) {
    return (
      <AppShell current="explore">
        <style dangerouslySetInnerHTML={{ __html: CSS }} />
        <div className="col-root"><div className="col-empty">Collection not found.</div></div>
      </AppShell>
    );
  }

  const { collection } = q.data;
  const bannerStyle = collection.banner_url
    ? { backgroundImage: `linear-gradient(120deg,rgba(24,26,77,0.35),rgba(15,74,66,0.35)), url(${collection.banner_url})` }
    : undefined;

  const goContent = (c: ContentPreview | null) => {
    if (!c?.id || !c.type) return;
    navigate({ to: routeForType(c.type as ContentType) as any, params: { id: c.id } as any });
  };

  const chips = [
    ...CHIP_TYPES.map((c) => ({ key: c.key, label: c.label, count: counts[c.key] ?? 0 })),
    ...(collection.devotional_template_id ? [{ key: "devotional", label: "Devotional", count: 1 }] : []),
  ].filter((c) => c.key === "all" || c.count > 0);

  return (
    <AppShell current="explore">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="col-root">
        <div className="col-crumb">
          <Link to="/explore"><b>Collections</b></Link> → {collection.title}
        </div>

        <div className="col-banner" style={bannerStyle}>
          <div className="inner">
            <div className="col-eyebrow">{startedAgo(collection.published_at)}</div>
            <h1 className="col-title">{collection.title}</h1>
          </div>
        </div>

        {(collection.writeup_body || collection.description_md) && (
          <div className="col-writeup">
            <p>{collection.writeup_body || collection.description_md}</p>
          </div>
        )}

        {collection.devotional_template_id && (
          <div className="col-devoanchor">
            <div className="left">
              <h4>New devotional layer — {collection.title}</h4>
              <p>A guided companion to Abide. Some days it's scripture and reflection; some days a podcast episode unlocks fresh, timed to where you are in it.</p>
            </div>
            <div className="right">
              <Link to="/devotionals/$id" params={{ id: collection.devotional_template_id }} className="col-addbtn">+ Add to my Abide</Link>
              <Link to="/devotionals/$id" params={{ id: collection.devotional_template_id }} className="col-seeinside">See what's inside →</Link>
            </div>
          </div>
        )}

        <div className="col-filterrow">
          {chips.map((c) => (
            <button
              key={c.key}
              className={`col-fchip${activeChip === c.key ? " active" : ""}`}
              onClick={() => setActiveChip(c.key)}
            >
              {c.label} · {c.count}
            </button>
          ))}
        </div>

        {grouped.length === 0 && (
          <div className="col-empty">No pieces to show for this filter.</div>
        )}

        {grouped.map(([week, items]) => {
          const released = items.filter((i) => !i.release_at || new Date(i.release_at).getTime() <= now);
          const coming = items.filter((i) => i.release_at && new Date(i.release_at).getTime() > now);
          return (
            <div key={week} className="col-weeksection">
              <div className="col-weekhead">
                <span className="col-weeklabel">Week {week}</span>
                <span className="col-weekcount">
                  {released.length} piece{released.length === 1 ? "" : "s"} released
                  {coming.length ? ` · ${coming.length} coming` : ""}
                </span>
              </div>
              <div className="col-rowgrid">
                {released.map((it) => {
                  const c = it.content;
                  if (!c) return null;
                  const type = (c.type ?? "essay") as string;
                  const isClip = type === "clip" || type === "promoted";
                  const label = type.charAt(0).toUpperCase() + type.slice(1);
                  const pillLabel = isClip
                    ? (type === "promoted" ? "Sponsored" : `Clip · ${fmtDur(c.duration_seconds) || "0:00"}`)
                    : label;
                  return (
                    <a
                      key={it.id}
                      className="col-piececard"
                      onClick={(e) => { e.preventDefault(); goContent(c); }}
                      href="#"
                    >
                      <div className="col-piecethumb" style={{ backgroundImage: `url(${c.thumbnail_url || IMG_FALLBACK(c.id ?? it.id)})` }}>
                        <span className={`col-ptag ${type}`}>{pillLabel}</span>
                        {isClip && (
                          <div className="col-playdot">
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="#181A4D"><path d="M8 5v14l11-7z" /></svg>
                          </div>
                        )}
                      </div>
                      <div className="col-piecebody">
                        <h4 className="col-piecetitle">{c.title}</h4>
                        <div className="col-piecemeta">{c.author_name ?? c.excerpt ?? ""}</div>
                      </div>
                    </a>
                  );
                })}
                {coming.map((it) => (
                  <div key={it.id} className="col-piececard col-soon">
                    <div className="col-piecethumb">
                      <span className="col-soon-label">Releasing soon</span>
                    </div>
                    <div className="col-piecebody">
                      <h4 className="col-piecetitle" style={{ opacity: 0.6 }}>— coming soon —</h4>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </AppShell>
  );
}
