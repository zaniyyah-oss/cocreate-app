import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Link2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { createPreviewToken } from "@/lib/preview-tokens.functions";
import { C } from "./ui";

export function publicHref(kind: string, id: string, slug?: string | null) {
  if (kind === "devotional") return slug ? `/devotionals/${slug}/overview` : "/explore/devotionals";
  if (kind === "teaching" || kind === "clip") return `/teachings/${id}`;
  if (kind === "podcast") return `/podcasts/${id}`;
  return `/essays/${id}`;
}

export function ShareButton({ table, id, variant = "light" }: { table: "content" | "devotional" | "series"; id: string; variant?: "light" | "dark" }) {
  const [open, setOpen] = useState(false);
  const [tokens, setTokens] = useState<{ id: string; created_at: string; expires_at: string; revoked_at: string | null }[]>([]);
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const load = async () => {
    const { data } = await supabase.from("preview_tokens").select("id, created_at, expires_at, revoked_at").eq("target_id", id).order("created_at", { ascending: false });
    setTokens(data ?? []);
  };
  useEffect(() => { if (open) void load(); }, [open]);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);
  const create = async () => {
    setBusy(true);
    try {
      const { token } = await createPreviewToken({ data: { scope: table, targetId: id } });
      const url = `${window.location.origin}/preview/${token}`;
      try { await navigator.clipboard.writeText(url); toast.success("Preview link copied · works for 14 days"); }
      catch { window.prompt("Copy this preview link", url); }
      await load();
    } catch (e: any) { toast.error(e?.message ?? "Couldn't create link"); }
    finally { setBusy(false); }
  };
  const revoke = async (tid: string) => {
    const { error } = await supabase.from("preview_tokens").update({ revoked_at: new Date().toISOString() }).eq("id", tid);
    if (error) toast.error(error.message); else { toast.success("Link revoked"); void load(); }
  };
  const active = tokens.filter((t) => !t.revoked_at && new Date(t.expires_at).getTime() > Date.now());
  const dark = variant === "dark";
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button type="button" className="st-btn" onClick={() => setOpen((o) => !o)} style={dark ? { background: "transparent", color: "#fff", borderColor: "rgba(255,255,255,.5)" } : undefined}>
        <Link2 size={15} strokeWidth={1.7} />{dark ? "Copy preview link" : "Share preview link"}
      </button>
      {open && (
        <div className="st-pop" style={{ right: 0, top: 46, width: 320, padding: 14, display: "flex", flexDirection: "column", gap: 10, color: C.INK }}>
          <span style={{ fontSize: 13.5, lineHeight: 1.5 }}>{table === "series" ? "Anyone with the link can see this series page — including parts that aren’t out yet — without signing in." : "Anyone with the link can read this piece without signing in."} Links expire after 14 days.</span>
          <button type="button" className="st-btn primary" onClick={create} disabled={busy}>{busy ? "Creating…" : "Create & copy new link"}</button>
          {active.length > 0 && <span className="st-h3" style={{ margin: "6px 0 0" }}>Active links</span>}
          {active.map((t) => (
            <div key={t.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12.5, color: C.MUTED }}>
              <span>Created {new Date(t.created_at).toLocaleDateString()} · expires {new Date(t.expires_at).toLocaleDateString()}</span>
              <button type="button" className="st-btn sm danger" onClick={() => revoke(t.id)}>Revoke</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
