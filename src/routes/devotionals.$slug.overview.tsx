import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/devotionals/$slug/overview")({
  component: OverviewPage,
  errorComponent: ({ error }) => (
    <AppShell current="devotionals">
      <div style={{ padding: 40 }}>Something went wrong: {error.message}</div>
    </AppShell>
  ),
  notFoundComponent: () => (
    <AppShell current="devotionals">
      <div style={{ padding: 40 }}>Devotional not found.</div>
    </AppShell>
  ),
  head: ({ params }) => ({
    meta: [
      { title: `${params.slug} · Overview — CoCreate` },
      { name: "description", content: "Overview of a devotional: what it's about, an intro video, and a day-by-day preview." },
    ],
  }),
});

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const CSS = `
.dov{--cream:#FBF8ED;--navy:#181A4D;--teal:#0F4A42;--limelight:#DCE07A;--ink:#20201C;--hair:rgba(24,26,77,0.12);padding:26px 20px 90px;max-width:1000px;margin:0 auto;width:100%;font-family:'Poppins',sans-serif;color:var(--ink);}
@media(min-width:900px){.dov{padding:30px 44px 90px;}}
.dov-crumb{font-size:13px;font-weight:600;color:var(--navy);opacity:0.6;margin-bottom:14px;}
.dov-crumb a{color:inherit;text-decoration:none;}
.dov-title{font-size:28px;font-weight:900;color:var(--navy);margin:0 0 6px;letter-spacing:-0.01em;line-height:1.15;}
@media(min-width:900px){.dov-title{font-size:34px;}}
.dov-meta{font-size:13px;color:var(--ink);opacity:0.6;font-weight:600;margin-bottom:22px;}

.dov-widget{background:var(--navy);color:var(--cream);border-radius:14px;padding:20px 22px;margin-bottom:24px;display:flex;flex-direction:column;gap:12px;}
@media(min-width:700px){.dov-widget{flex-direction:row;align-items:center;justify-content:space-between;gap:20px;padding:22px 26px;}}
.dov-widget-copy h2{font-size:17px;font-weight:800;margin:0 0 4px;color:var(--limelight);letter-spacing:-0.01em;}
.dov-widget-copy p{font-size:13.5px;line-height:1.55;margin:0;opacity:0.9;}
.dov-widget-cta{background:var(--limelight);color:var(--navy);font-size:13px;font-weight:800;padding:11px 22px;border-radius:999px;cursor:pointer;border:none;font-family:inherit;white-space:nowrap;text-decoration:none;display:inline-block;text-align:center;}
.dov-widget-cta.added{background:transparent;border:1.5px solid var(--limelight);color:var(--limelight);}

.dov-video{position:relative;width:100%;background:#000;border-radius:14px;overflow:hidden;margin-bottom:24px;aspect-ratio:16/9;}
.dov-video iframe,.dov-video video{position:absolute;inset:0;width:100%;height:100%;border:none;}

.dov-overview{font-size:14.5px;line-height:1.7;color:var(--ink);opacity:0.88;margin-bottom:34px;white-space:pre-wrap;}
.dov-overview p{margin:0 0 12px;}

.dov-sectlabel{font-size:11.5px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:var(--navy);opacity:0.75;margin:0 0 12px;}

.dov-acc{display:flex;flex-direction:column;gap:6px;}
.dov-row{background:#fff;border:1px solid var(--hair);border-radius:10px;overflow:hidden;}
.dov-rowhead{width:100%;display:grid;grid-template-columns:auto 1fr auto;gap:12px;align-items:center;padding:12px 14px;background:transparent;border:none;cursor:pointer;text-align:left;font-family:inherit;}
.dov-rowhead:hover{background:rgba(220,224,122,0.15);}
.dov-daylabel{font-size:12.5px;font-weight:800;color:var(--navy);letter-spacing:0.02em;min-width:88px;}
.dov-daylabel .sub{display:block;font-size:10.5px;font-weight:600;color:var(--ink);opacity:0.55;letter-spacing:0.02em;margin-top:1px;}
.dov-focus{font-size:13px;color:var(--ink);opacity:0.85;line-height:1.4;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;}
.dov-focus.empty{opacity:0.4;}
.dov-chev{font-size:14px;color:var(--navy);opacity:0.5;transition:transform 0.15s;}
.dov-chev.open{transform:rotate(90deg);}

.dov-detail{padding:14px 16px 18px;border-top:1px solid var(--hair);background:#FBF8ED;display:grid;gap:12px;}
.dov-dsub{font-size:10px;font-weight:800;color:var(--navy);letter-spacing:0.1em;text-transform:uppercase;margin:0 0 3px;}
.dov-dval{font-size:13px;color:var(--ink);line-height:1.55;white-space:pre-wrap;}
.dov-dval.empty{color:#8a8678;font-style:italic;}
`;

type Template = {
  id: string;
  slug: string | null;
  title: string;
  description: string | null;
  duration_days: number | null;
  overview_text: string | null;
  intro_video_url: string | null;
  widget_heading: string | null;
  widget_subheading: string | null;
  widget_cta_label: string | null;
  scripture_items: unknown;
  pray_prompt: string | null;
  apply_prompt: string | null;
};

type DayRow = {
  id: string;
  day_number: number;
  is_override: boolean;
  focus_preview: string | null;
  scripture_reference: string | null;
  scripture_note: string | null;
  pray_prompt: string | null;
  apply_prompt: string | null;
};

function toEmbedUrl(url: string): { kind: "iframe" | "video"; src: string } | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  // YouTube
  const ytMatch = trimmed.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/);
  if (ytMatch) return { kind: "iframe", src: `https://www.youtube.com/embed/${ytMatch[1]}` };
  // Vimeo
  const vmMatch = trimmed.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vmMatch) return { kind: "iframe", src: `https://player.vimeo.com/video/${vmMatch[1]}` };
  // Direct video file
  if (/\.(mp4|webm|ogg|mov)($|\?)/i.test(trimmed)) return { kind: "video", src: trimmed };
  // Fallback: try to embed as iframe
  return { kind: "iframe", src: trimmed };
}

function addDaysISO(startISO: string, offset: number): string {
  const d = new Date(startISO + (startISO.length === 10 ? "T00:00:00" : ""));
  d.setDate(d.getDate() + offset);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function formatDateShort(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

function OverviewPage() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [openDays, setOpenDays] = useState<Set<number>>(new Set());

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUserId(data.session?.user.id ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setUserId(s?.user.id ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  const q = useQuery({
    queryKey: ["dev-overview", slug],
    queryFn: async () => {
      const isUuid = UUID_RE.test(slug);
      const base = (supabase.from as any)("devotional_templates")
        .select("id, slug, title, description, duration_days, overview_text, intro_video_url, widget_heading, widget_subheading, widget_cta_label, scripture_items, pray_prompt, apply_prompt")
        .eq("status", "published");
      const tpl = isUuid
        ? await base.or(`id.eq.${slug},slug.eq.${slug}`).maybeSingle()
        : await base.eq("slug", slug).maybeSingle();
      const template = tpl.data as Template | null;
      if (!template) return null;

      const { data: days, error } = await (supabase.from as any)("devotional_days")
        .select("id, day_number, is_override, focus_preview, scripture_reference, scripture_note, pray_prompt, apply_prompt")
        .eq("template_id", template.id)
        .order("day_number", { ascending: true });
      if (error) throw error;
      return { template, days: (days ?? []) as DayRow[] };
    },
  });

  const startQ = useQuery({
    queryKey: ["dev-overview-start", q.data?.template?.id, userId],
    enabled: !!q.data?.template?.id && !!userId,
    queryFn: async () => {
      const tid = q.data!.template!.id;
      const [savedRes, entryRes] = await Promise.all([
        supabase.from("saved_items")
          .select("saved_at")
          .eq("user_id", userId!)
          .eq("devotional_template_id", tid)
          .order("saved_at", { ascending: true })
          .limit(1)
          .maybeSingle(),
        supabase.from("devotional_entries")
          .select("entry_date")
          .eq("user_id", userId!)
          .eq("template_id", tid)
          .order("entry_date", { ascending: true })
          .limit(1)
          .maybeSingle(),
      ]);
      const savedIso: string | null = savedRes.data?.saved_at
        ? (savedRes.data.saved_at as string).slice(0, 10)
        : null;
      const entryIso: string | null = (entryRes.data as any)?.entry_date ?? null;
      // Pick the earlier of the two if both exist
      const candidates = [savedIso, entryIso].filter(Boolean) as string[];
      const startDate = candidates.length ? candidates.sort()[0] : null;
      return { added: !!startDate, startDate };
    },
  });

  const t = q.data?.template;
  const days = q.data?.days ?? [];
  const totalDays = useMemo(() => {
    if (!t) return 0;
    return t.duration_days ?? (days.length ? Math.max(...days.map((d) => d.day_number)) : 0);
  }, [t, days]);

  const scriptureItems = useMemo<Array<{ reference: string; note: string }>>(() => {
    const raw = Array.isArray(t?.scripture_items) ? (t?.scripture_items as any[]) : [];
    return raw.map((it) => ({
      reference: String(it?.reference ?? ""),
      note: String(it?.note ?? ""),
    }));
  }, [t]);

  const byDay = useMemo(() => {
    const m = new Map<number, DayRow>();
    for (const r of days) m.set(r.day_number, r);
    return m;
  }, [days]);

  const contentFor = (day: number) => {
    const row = byDay.get(day);
    const scr = scriptureItems[day - 1];
    if (row && row.is_override) {
      return {
        focus: row.focus_preview ?? "",
        scripture_reference: row.scripture_reference ?? "",
        scripture_note: row.scripture_note ?? "",
        pray: row.pray_prompt ?? t?.pray_prompt ?? "",
        apply: row.apply_prompt ?? t?.apply_prompt ?? "",
      };
    }
    return {
      focus: row?.focus_preview ?? "",
      scripture_reference: scr?.reference ?? "",
      scripture_note: scr?.note ?? "",
      pray: t?.pray_prompt ?? "",
      apply: t?.apply_prompt ?? "",
    };
  };

  const toggle = (day: number) =>
    setOpenDays((s) => {
      const n = new Set(s);
      if (n.has(day)) n.delete(day); else n.add(day);
      return n;
    });

  const addToWorkspace = async () => {
    if (!t) return;
    if (!userId) { navigate({ to: "/auth" }); return; }
    await supabase.from("saved_items").upsert({
      user_id: userId,
      devotional_template_id: t.id,
    } as any, { onConflict: "user_id,devotional_template_id" } as any);
    navigate({ to: "/devotionals/$id", params: { id: t.id }, search: {} as any });
  };

  if (q.isLoading) {
    return (
      <AppShell current="devotionals">
        <style dangerouslySetInnerHTML={{ __html: CSS }} />
        <div className="dov" style={{ padding: 40 }}>Loading…</div>
      </AppShell>
    );
  }
  if (!t) {
    return (
      <AppShell current="devotionals">
        <style dangerouslySetInnerHTML={{ __html: CSS }} />
        <div className="dov" style={{ padding: 40 }}>Devotional not found.</div>
      </AppShell>
    );
  }

  const embed = toEmbedUrl(t.intro_video_url ?? "");
  const added = startQ.data?.added ?? false;
  const startDate = startQ.data?.startDate ?? null;

  return (
    <AppShell current="devotionals">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="dov">
        <div className="dov-crumb">
          <Link to="/devotionals">Workspace</Link> → Devotional overview
        </div>

        <h1 className="dov-title">{t.title}</h1>
        <div className="dov-meta">
          {totalDays ? `${totalDays} day${totalDays === 1 ? "" : "s"}` : "Ongoing"}
          {t.description ? ` · ${t.description}` : ""}
        </div>

        <div className="dov-widget">
          <div className="dov-widget-copy">
            <h2>{t.widget_heading || "Add to your workspace"}</h2>
            <p>{t.widget_subheading || "Bring this devotional into your daily workspace and start Day 1 whenever you're ready."}</p>
          </div>
          {added ? (
            <Link to="/devotionals/$id" params={{ id: t.id }} search={{} as any} className="dov-widget-cta added">Open in workspace →</Link>
          ) : (
            <button type="button" className="dov-widget-cta" onClick={addToWorkspace}>
              {t.widget_cta_label || "Start this devotional"}
            </button>
          )}
        </div>

        {embed && (
          <div className="dov-video">
            {embed.kind === "iframe" ? (
              <iframe src={embed.src} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen title="Devotional intro video" />
            ) : (
              <video src={embed.src} controls playsInline />
            )}
          </div>
        )}

        {t.overview_text && (
          <div className="dov-overview">{t.overview_text}</div>
        )}

        {totalDays > 0 && (
          <>
            <div className="dov-sectlabel">Day by day</div>
            <div className="dov-acc">
              {Array.from({ length: totalDays }, (_, i) => i + 1).map((day) => {
                const open = openDays.has(day);
                const c = contentFor(day);
                const dateIso = added && startDate ? addDaysISO(startDate, day - 1) : null;
                return (
                  <div key={day} className="dov-row">
                    <button type="button" className="dov-rowhead" onClick={() => toggle(day)}>
                      <span className="dov-daylabel">
                        {dateIso ? formatDateShort(dateIso) : `Day ${day}`}
                        {dateIso && <span className="sub">Day {day}</span>}
                      </span>
                      <span className={`dov-focus${c.focus ? "" : " empty"}`}>
                        {c.focus || c.scripture_reference || "Preview coming soon"}
                      </span>
                      <span className={`dov-chev${open ? " open" : ""}`} aria-hidden>›</span>
                    </button>
                    {open && (
                      <div className="dov-detail">
                        <div>
                          <div className="dov-dsub">Scripture</div>
                          <div className={`dov-dval${c.scripture_reference || c.scripture_note ? "" : " empty"}`}>
                            {c.scripture_reference || "—"}
                            {c.scripture_note && <>{"\n"}{c.scripture_note}</>}
                          </div>
                        </div>
                        <div>
                          <div className="dov-dsub">Prayer prompt</div>
                          <div className={`dov-dval${c.pray ? "" : " empty"}`}>{c.pray || "—"}</div>
                        </div>
                        <div>
                          <div className="dov-dsub">To-do / Apply</div>
                          <div className={`dov-dval${c.apply ? "" : " empty"}`}>{c.apply || "—"}</div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
