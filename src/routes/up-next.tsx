import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import {
  useSessionUserId, useUpNext, useInvalidateUpNext, setKept, removeSaved, createReflectionNote,
  routeForType, lengthLabel, typeLabel, type UpNextRow,
} from "@/lib/up-next";

export const Route = createFileRoute("/up-next")({
  validateSearch: (s: Record<string, unknown>): { tab?: "kept" } => (s.tab === "kept" ? { tab: "kept" } : {}),
  component: UpNextPage,
  head: () => ({
    meta: [
      { title: "Up next — CoCreate" },
      { name: "description", content: "The teachings, essays and podcasts you saved to come back to." },
      { property: "og:title", content: "Up next — CoCreate" },
      { property: "og:description", content: "Finish something and it clears itself, unless you keep it." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const CSS = `
.un{max-width:880px;margin:0 auto;padding:44px 24px 120px;font-family:'Poppins',sans-serif;color:#20201C;}
.un h1{font-family:'Archivo Black','Poppins',sans-serif;font-size:40px;color:#181A4D;margin:0 0 6px;}
.un-sub{font-size:14.5px;color:#6f6b5e;margin:0 0 24px;}
.un-tabs{display:inline-flex;background:#fff;border:1px solid rgba(24,26,77,0.1);border-radius:999px;padding:4px;margin-bottom:20px;}
.un-tabs button{border:none;background:transparent;border-radius:999px;padding:8px 18px;font-family:inherit;font-size:14px;font-weight:700;color:#6f6b5e;cursor:pointer;}
.un-tabs button.on{background:#181A4D;color:#fff;}
.un-fin{background:#181A4D;color:#FBF8ED;border-radius:16px;padding:20px 22px;margin-bottom:18px;}
.un-fin .eb{font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#DCE07A;margin-bottom:6px;}
.un-fin h3{font-size:18px;font-weight:800;margin:0 0 14px;color:#fff;}
.un-fin .row{display:flex;gap:8px;flex-wrap:wrap;}
.un-fin button{border-radius:999px;padding:9px 16px;font-family:inherit;font-weight:800;font-size:12.5px;cursor:pointer;border:1.5px solid rgba(255,255,255,0.35);background:transparent;color:#fff;}
.un-fin button.lime{background:#DCE07A;border-color:#DCE07A;color:#181A4D;}
.un-list{display:flex;flex-direction:column;gap:10px;}
.un-row{display:flex;align-items:center;gap:14px;background:#fff;border:1px solid rgba(24,26,77,0.08);border-radius:14px;padding:10px 12px;position:relative;}
.un-row .thumb{width:72px;height:54px;border-radius:9px;background-size:cover;background-position:center;background-color:#DCE07A;flex-shrink:0;}
.un-row .body{flex:1;min-width:0;}
.un-row h4{margin:0 0 3px;font-size:14.5px;font-weight:700;color:#181A4D;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.un-row .meta{font-size:12px;color:#8a8678;font-weight:600;}
.un-more{width:34px;height:34px;border-radius:9px;border:none;background:transparent;cursor:pointer;color:#6f6b5e;font-size:18px;font-weight:800;}
.un-more:hover{background:#FBF8ED;}
.un-menu{position:absolute;right:10px;top:calc(100% - 6px);background:#fff;border:1px solid rgba(24,26,77,0.1);border-radius:12px;box-shadow:0 12px 32px rgba(0,0,0,0.12);padding:6px;z-index:20;min-width:150px;}
.un-menu button{display:block;width:100%;text-align:left;border:none;background:transparent;padding:9px 12px;border-radius:8px;font-family:inherit;font-size:13.5px;font-weight:600;color:#181A4D;cursor:pointer;}
.un-menu button:hover{background:#FBF8ED;}
.un-menu button.danger{color:#B42318;}
.un-empty{border:1.5px dashed rgba(24,26,77,0.2);border-radius:14px;padding:22px;color:#6f6b5e;font-size:14px;}
.un-empty a{color:#0F4A42;font-weight:700;}
@media(max-width:640px){.un{padding:24px 16px 110px;}.un h1{font-size:32px;}}
`;

const coverOf = (r: UpNextRow) => (r.content as any).cover_image_url || r.content.thumbnail_url || "";

function UpNextPage() {
  const userId = useSessionUserId();
  const navigate = useNavigate();
  const { tab } = Route.useSearch();
  const q = useUpNext(userId);
  const invalidate = useInvalidateUpNext();
  const [menu, setMenu] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [menu]);

  useEffect(() => {
    if (userId === null) navigate({ to: "/auth", replace: true });
  }, [userId, navigate]);

  const rows = q.data ?? [];
  const upNext = rows.filter((r) => !r.kept);
  const kept = rows.filter((r) => r.kept);
  const finished = upNext
    .filter((r) => r.finished_at)
    .sort((a, b) => (b.finished_at! > a.finished_at! ? 1 : -1))[0];
  const list = tab === "kept" ? kept : upNext.filter((r) => r !== finished);

  const run = async (fn: () => Promise<unknown>, msg?: string) => {
    setBusy(true);
    try { await fn(); if (msg) toast.success(msg); invalidate(); }
    catch (e: any) { toast.error(e?.message ?? "Something went wrong."); }
    finally { setBusy(false); }
  };

  const reflect = async (r: UpNextRow) => {
    if (!userId) return;
    setBusy(true);
    try {
      const { noteId, templateId } = await createReflectionNote(userId, r.content);
      if (templateId) navigate({ to: "/devotionals/$id", params: { id: templateId }, search: { ws: noteId } as any });
      else navigate({ to: "/devotionals" });
    } catch (e: any) {
      toast.error(e?.message ?? "Could not start a reflection.");
      setBusy(false);
    }
  };

  return (
    <AppShell current="explore">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="un">
        <h1>Up next</h1>
        <p className="un-sub">Finish something and it clears itself, unless you keep it.</p>

        <div className="un-tabs" role="tablist">
          <button role="tab" aria-selected={tab !== "kept"} className={tab !== "kept" ? "on" : ""} onClick={() => navigate({ to: "/up-next", search: {} })}>Up next ({upNext.length})</button>
          <button role="tab" aria-selected={tab === "kept"} className={tab === "kept" ? "on" : ""} onClick={() => navigate({ to: "/up-next", search: { tab: "kept" } })}>Kept ({kept.length})</button>
        </div>

        {tab !== "kept" && finished && (
          <div className="un-fin">
            <div className="eb">You finished · {finished.content.title}</div>
            <h3>Keep it, clear it, or carry it into your workspace.</h3>
            <div className="row">
              <button type="button" disabled={busy} onClick={() => run(() => setKept(finished.savedId, true), "Moved to Kept")}>Keep it</button>
              <button type="button" disabled={busy} onClick={() => run(() => removeSaved(finished.savedId), "Cleared")}>Clear</button>
              <button type="button" className="lime" disabled={busy} onClick={() => reflect(finished)}>Reflect in workspace</button>
            </div>
          </div>
        )}

        {q.isLoading ? (
          <div className="un-empty">Loading…</div>
        ) : list.length === 0 ? (
          <div className="un-empty">
            {tab === "kept"
              ? "Nothing kept yet. When you finish something you want to hold onto, choose Keep it."
              : <>Nothing waiting. Tap Save on anything in <Link to="/" search={{ feed: 1 } as any}>Explore</Link> to line it up here.</>}
          </div>
        ) : (
          <div className="un-list">
            {list.map((r) => (
              <div key={r.savedId} className="un-row">
                <Link to={routeForType(r.content.type) as any} params={{ id: r.content.id! } as any} style={{ display: "flex", alignItems: "center", gap: 14, flex: 1, minWidth: 0, textDecoration: "none" }}>
                  <div className="thumb" style={{ backgroundImage: coverOf(r) ? `url(${coverOf(r)})` : undefined }} />
                  <div className="body">
                    <h4>{r.content.title}</h4>
                    <div className="meta">{[typeLabel(r.content.type), lengthLabel(r.content)].filter(Boolean).join(" · ")}</div>
                  </div>
                </Link>
                <button type="button" className="un-more" aria-label="More options" onClick={(e) => { e.stopPropagation(); setMenu(menu === r.savedId ? null : r.savedId); }}>⋯</button>
                {menu === r.savedId && (
                  <div className="un-menu" onClick={(e) => e.stopPropagation()}>
                    {r.kept
                      ? <button type="button" onClick={() => { setMenu(null); run(() => setKept(r.savedId, false), "Moved back to Up next"); }}>Move to Up next</button>
                      : <button type="button" onClick={() => { setMenu(null); run(() => setKept(r.savedId, true), "Moved to Kept"); }}>Keep</button>}
                    <button type="button" className="danger" onClick={() => { setMenu(null); run(() => removeSaved(r.savedId), "Removed"); }}>Remove</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
