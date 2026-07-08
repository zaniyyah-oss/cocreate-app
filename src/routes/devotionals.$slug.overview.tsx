import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/devotionals/$slug/overview" as any)({
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
      { name: "description", content: "Overview of a topical devotional: its rationale, movements, and day-by-day structure." },
    ],
  }),
});

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const DEFAULT_PHILOSOPHY =
  "Our hope is that this becomes unnecessary. The goal isn't for you to depend on a reminder from us — it's for you to grow strong enough in this to disciple someone else in it. You're still leading your own life here; we're handing you scripture and a structure, not doing the work of believing it for you.";

const CSS = `
.dov{--cream:#FBF8ED;--navy:#181A4D;--teal:#0F4A42;--limelight:#DCE07A;--amber:#FFAE00;--burgundy:#441B07;--blush:#E990A2;--ink:#20201C;--hair:rgba(24,26,77,0.12);padding:26px 20px 90px;max-width:1100px;margin:0 auto;width:100%;font-family:'Poppins',sans-serif;color:var(--ink);}
@media(min-width:900px){.dov{padding:30px 44px 90px;}}
.dov-crumb{font-size:13px;font-weight:600;color:var(--navy);opacity:0.55;margin-bottom:14px;}
.dov-crumb b{opacity:1;}
.dov-crumb a{color:inherit;text-decoration:none;}
.dov-head{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;margin-bottom:8px;flex-wrap:wrap;}
.dov-head h1{font-size:28px;font-weight:900;color:var(--navy);margin:0 0 6px;letter-spacing:-0.01em;line-height:1.1;}
@media(min-width:900px){.dov-head h1{font-size:34px;}}
.dov-head .meta{font-size:13px;color:var(--ink);opacity:0.6;font-weight:600;}
.dov-addbtn{background:var(--navy);color:var(--limelight);font-size:12.5px;font-weight:700;padding:9px 18px;border-radius:999px;cursor:pointer;border:none;font-family:inherit;white-space:nowrap;text-decoration:none;display:inline-block;}
.dov-addbtn.added{background:var(--limelight);color:var(--navy);}

.dov-progresswrap{margin:18px 0 28px;}
.dov-progresslabel{display:flex;justify-content:space-between;font-size:12px;font-weight:600;color:var(--navy);margin-bottom:6px;}
.dov-progresslabel span.faded{opacity:0.5;}
.dov-progressbar{height:8px;background:rgba(24,26,77,0.08);border-radius:999px;overflow:hidden;}
.dov-progressfill{height:100%;background:var(--limelight);border-radius:999px;transition:width 0.4s ease;}

.dov-toplabel{font-size:11.5px;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;color:var(--burgundy);margin-bottom:14px;}
.dov-whyblock{margin-bottom:36px;}
.dov-whyrow{display:grid;grid-template-columns:1fr;gap:16px;margin-bottom:18px;}
@media(min-width:700px){.dov-whyrow{grid-template-columns:repeat(3,1fr);}}
.dov-whycard{background:#fff;border:1px solid var(--hair);border-radius:12px;padding:18px 20px;}
.dov-whycard h4{font-size:13px;font-weight:800;color:var(--navy);margin:0 0 8px;}
.dov-whycard p{font-size:13px;color:var(--ink);opacity:0.75;line-height:1.6;margin:0;white-space:pre-wrap;}

.dov-aim{background:var(--navy);border-radius:12px;padding:18px 22px;display:flex;gap:14px;align-items:flex-start;}
.dov-aim .icon{font-size:18px;flex-shrink:0;margin-top:1px;color:var(--limelight);}
.dov-aim p{color:var(--cream);font-size:13.5px;line-height:1.65;margin:0;opacity:0.92;white-space:pre-wrap;}

.dov-insidehead{margin:38px 0 16px;}
.dov-insidehead p{font-size:13.5px;color:var(--ink);opacity:0.7;line-height:1.6;margin:0;max-width:720px;}

.dov-movement{margin-bottom:22px;}
.dov-mhead{display:flex;justify-content:space-between;align-items:baseline;padding:12px 16px;background:#fff;border:1px solid var(--hair);border-radius:12px 12px 0 0;cursor:pointer;gap:12px;}
.dov-mhead.closed{border-radius:12px;}
.dov-mtitle{font-size:14px;font-weight:700;color:var(--navy);}
.dov-mrange{font-size:11.5px;color:var(--ink);opacity:0.45;font-weight:600;margin-left:8px;}
.dov-chev{font-size:14px;color:var(--navy);opacity:0.45;font-family:inherit;}
.dov-mdesc{padding:10px 16px 4px;font-size:12.5px;color:var(--ink);opacity:0.65;background:#fff;border-left:1px solid var(--hair);border-right:1px solid var(--hair);line-height:1.5;}

.dov-dayrow{display:grid;grid-template-columns:64px 1fr auto auto;align-items:center;padding:11px 16px;background:#fff;border:1px solid var(--hair);border-top:none;font-size:13px;cursor:pointer;gap:12px;}
.dov-dayrow:hover{background:rgba(220,224,122,0.15);}
.dov-dayrow.current{background:rgba(220,224,122,0.22);}
.dov-daynum{font-weight:700;color:var(--navy);opacity:0.55;}
.dov-daytitle{color:var(--navy);font-weight:600;line-height:1.3;}
.dov-daymedium{display:flex;align-items:center;gap:6px;font-size:11px;color:var(--ink);opacity:0.6;font-weight:600;}
.dov-dot{width:6px;height:6px;border-radius:50%;flex-shrink:0;}
.dov-dot.scripture{background:var(--teal);}
.dov-dot.podcast{background:var(--amber);}
.dov-dot.reflect{background:var(--blush);}
.dov-dayopen{color:var(--navy);opacity:0.45;font-size:11.5px;font-weight:600;text-align:right;}
.dov-daydetail{background:rgba(220,224,122,0.14);border:1px solid var(--hair);border-top:none;padding:16px 20px;font-size:12.5px;color:var(--ink);opacity:0.9;line-height:1.6;}
.dov-daydetail b{color:var(--navy);}
.dov-mempty{padding:14px 16px;background:#fff;border:1px solid var(--hair);border-top:none;border-radius:0 0 12px 12px;font-size:12.5px;color:var(--ink);opacity:0.6;}
.dov-mfoot{border-bottom-left-radius:12px;border-bottom-right-radius:12px;}
`;

type Template = {
  id: string;
  slug: string | null;
  title: string;
  description: string | null;
  duration_days: number | null;
  overview_intro: string | null;
  overview_problem: string | null;
  overview_belief: string | null;
  overview_aim: string | null;
  overview_philosophy: string | null;
};

type Movement = {
  id: string;
  position: number;
  title: string;
  description: string | null;
  day_start: number;
  day_end: number;
};

type DayRow = {
  id: string;
  day_number: number;
  title: string;
  medium: "scripture" | "podcast" | "reflect";
  scripture_reference: string | null;
  preview_read: string | null;
  preview_reflect: string | null;
  preview_carry: string | null;
};

function OverviewPage() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [openMovements, setOpenMovements] = useState<Record<string, boolean>>({});
  const [openDay, setOpenDay] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUserId(data.session?.user.id ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setUserId(s?.user.id ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  const q = useQuery({
    queryKey: ["dev-overview", slug],
    queryFn: async () => {
      const isUuid = UUID_RE.test(slug);
      const tpl = await (supabase.from as any)("devotional_templates")
        .select("id, slug, title, description, duration_days, overview_intro, overview_problem, overview_belief, overview_aim, overview_philosophy")
        [isUuid ? "or" : "eq"](isUuid ? `id.eq.${slug},slug.eq.${slug}` : "slug", isUuid ? undefined : slug)
        .eq("status", "published")
        .maybeSingle();
      const template = tpl.data as Template | null;
      if (!template) return null;

      const [mvRes, dyRes] = await Promise.all([
        (supabase.from as any)("devotional_movements")
          .select("id, position, title, description, day_start, day_end")
          .eq("template_id", template.id)
          .order("position", { ascending: true }),
        (supabase.from as any)("devotional_days")
          .select("id, day_number, title, medium, scripture_reference, preview_read, preview_reflect, preview_carry")
          .eq("template_id", template.id)
          .order("day_number", { ascending: true }),
      ]);
      return {
        template,
        movements: (mvRes.data ?? []) as Movement[],
        days: (dyRes.data ?? []) as DayRow[],
      };
    },
  });

  const progQ = useQuery({
    queryKey: ["dev-overview-progress", q.data?.template?.id, userId],
    enabled: !!q.data?.template?.id && !!userId,
    queryFn: async () => {
      const tid = q.data!.template!.id;
      const [entRes, savedRes] = await Promise.all([
        supabase.from("devotional_entries")
          .select("entry_date")
          .eq("user_id", userId!)
          .eq("template_id", tid)
          .order("entry_date", { ascending: true }),
        supabase.from("saved_items")
          .select("id")
          .eq("user_id", userId!)
          .eq("devotional_template_id", tid)
          .limit(1),
      ]);
      const dates = (entRes.data ?? []).map((r: any) => r.entry_date as string);
      const uniqueDays = new Set(dates).size;
      const startedAt = dates[0] ?? null;
      const added = (savedRes.data ?? []).length > 0 || uniqueDays > 0;
      return { uniqueDays, startedAt, added };
    },
  });

  const currentMovementId = useMemo(() => {
    if (!q.data) return null;
    const day = Math.max(1, progQ.data?.uniqueDays ?? 0);
    const mv = q.data.movements.find((m) => day >= m.day_start && day <= m.day_end);
    return mv?.id ?? q.data.movements[0]?.id ?? null;
  }, [q.data, progQ.data]);

  useEffect(() => {
    if (currentMovementId && openMovements[currentMovementId] === undefined) {
      setOpenMovements((s) => ({ ...s, [currentMovementId]: true }));
    }
  }, [currentMovementId]); // eslint-disable-line react-hooks/exhaustive-deps

  const addToAbide = async () => {
    if (!q.data?.template) return;
    if (!userId) { navigate({ to: "/auth" }); return; }
    await supabase.from("saved_items").upsert({
      user_id: userId,
      devotional_template_id: q.data.template.id,
    } as any, { onConflict: "user_id,devotional_template_id" } as any);
    navigate({ to: "/devotionals/$id", params: { id: q.data.template.id } });
  };

  if (q.isLoading) {
    return (
      <AppShell current="devotionals">
        <style dangerouslySetInnerHTML={{ __html: CSS }} />
        <div className="dov" style={{ padding: 40 }}>Loading…</div>
      </AppShell>
    );
  }
  if (!q.data?.template) {
    return (
      <AppShell current="devotionals">
        <style dangerouslySetInnerHTML={{ __html: CSS }} />
        <div className="dov" style={{ padding: 40 }}>Devotional not found.</div>
      </AppShell>
    );
  }

  const t = q.data.template;
  const totalDays = t.duration_days ?? Math.max(...q.data.days.map((d) => d.day_number), 0) || 0;
  const uniqueDays = progQ.data?.uniqueDays ?? 0;
  const startedAt = progQ.data?.startedAt ?? null;
  const added = progQ.data?.added ?? false;
  const pct = totalDays ? Math.min(100, Math.round((uniqueDays / totalDays) * 100)) : 0;
  const daysAgo = startedAt ? Math.floor((Date.now() - new Date(startedAt).getTime()) / 86400000) : 0;

  const daysByMovement = (m: Movement) =>
    q.data!.days.filter((d) => d.day_number >= m.day_start && d.day_number <= m.day_end);

  return (
    <AppShell current="devotionals">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="dov">
        <div className="dov-crumb">
          <Link to="/devotionals"><b>{t.title}</b></Link> → Devotional overview
        </div>

        <div className="dov-head">
          <div>
            <h1>{t.title}</h1>
            <div className="meta">{totalDays ? `${totalDays} days · ` : ""}a guided layer for Abide</div>
          </div>
          <div>
            {added ? (
              <Link to="/devotionals/$id" params={{ id: t.id }} className="dov-addbtn added">Open in Abide →</Link>
            ) : (
              <button className="dov-addbtn" onClick={addToAbide}>+ Add to my Abide</button>
            )}
          </div>
        </div>

        {added && totalDays > 0 && (
          <div className="dov-progresswrap">
            <div className="dov-progresslabel">
              <span>Day {Math.min(totalDays, Math.max(1, uniqueDays))} of {totalDays}</span>
              <span className="faded">{startedAt ? `started ${daysAgo === 0 ? "today" : daysAgo + " day" + (daysAgo === 1 ? "" : "s") + " ago"}` : ""}</span>
            </div>
            <div className="dov-progressbar"><div className="dov-progressfill" style={{ width: `${pct}%` }} /></div>
          </div>
        )}

        {(t.overview_problem || t.overview_belief || t.overview_aim || t.overview_philosophy) && (
          <div className="dov-whyblock">
            <div className="dov-toplabel">Why this exists</div>
            <div className="dov-whyrow">
              <div className="dov-whycard">
                <h4>The problem</h4>
                <p>{t.overview_problem || "—"}</p>
              </div>
              <div className="dov-whycard">
                <h4>What we believe</h4>
                <p>{t.overview_belief || "—"}</p>
              </div>
              <div className="dov-whycard">
                <h4>What this is trying to do</h4>
                <p>{t.overview_aim || "—"}</p>
              </div>
            </div>
            <div className="dov-aim">
              <span className="icon">✦</span>
              <p>{t.overview_philosophy || DEFAULT_PHILOSOPHY}</p>
            </div>
          </div>
        )}

        {q.data.movements.length > 0 && (
          <>
            <div className="dov-insidehead">
              <div className="dov-toplabel">What's inside</div>
              <p>{t.overview_intro || `${totalDays || ""} days, organized in ${q.data.movements.length} movement${q.data.movements.length === 1 ? "" : "s"}. Click into any day to see what's planned before you commit to starting.`}</p>
            </div>

            {q.data.movements.map((m) => {
              const isOpen = openMovements[m.id] ?? m.id === currentMovementId;
              const days = daysByMovement(m);
              return (
                <div key={m.id} className="dov-movement">
                  <div
                    className={`dov-mhead${!isOpen ? " closed" : ""}`}
                    onClick={() => setOpenMovements((s) => ({ ...s, [m.id]: !isOpen }))}
                  >
                    <div>
                      <span className="dov-mtitle">{m.title}</span>
                      <span className="dov-mrange">Days {m.day_start}–{m.day_end}</span>
                    </div>
                    <span className="dov-chev">{isOpen ? "⌃" : "⌄"}</span>
                  </div>

                  {isOpen && m.description && <div className="dov-mdesc">{m.description}</div>}

                  {isOpen && days.length === 0 && (
                    <div className="dov-mempty dov-mfoot">Days for this movement haven't been added yet.</div>
                  )}

                  {isOpen && days.map((d, idx) => {
                    const isCurrent = added && uniqueDays > 0 && d.day_number === Math.min(totalDays || Infinity, uniqueDays);
                    const isLast = idx === days.length - 1;
                    const isOpenDay = openDay === d.id;
                    return (
                      <div key={d.id}>
                        <div
                          className={`dov-dayrow${isCurrent ? " current" : ""}${isLast && !isOpenDay ? " dov-mfoot" : ""}`}
                          onClick={() => setOpenDay(isOpenDay ? null : d.id)}
                        >
                          <div className="dov-daynum">Day {d.day_number}</div>
                          <div className="dov-daytitle">{d.title}</div>
                          <div className="dov-daymedium">
                            <span className={`dov-dot ${d.medium}`}></span>
                            {d.medium === "scripture" ? "Scripture + reflection" : d.medium === "podcast" ? "Podcast unlocks today" : "Reflection"}
                          </div>
                          <div className="dov-dayopen">{isCurrent ? "today" : isOpenDay ? "close" : "preview →"}</div>
                        </div>
                        {isOpenDay && (
                          <div className={`dov-daydetail${isLast ? " dov-mfoot" : ""}`}>
                            {d.preview_read && <><b>Read —</b> {d.scripture_reference ? `${d.scripture_reference}. ` : ""}{d.preview_read} </>}
                            {d.preview_reflect && <><b>Reflect —</b> {d.preview_reflect} </>}
                            {d.preview_carry && <><b>Carry —</b> {d.preview_carry}</>}
                            {!d.preview_read && !d.preview_reflect && !d.preview_carry && (
                              <span style={{ opacity: 0.6 }}>Preview isn't written for this day yet.</span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </>
        )}
      </div>
    </AppShell>
  );
}
