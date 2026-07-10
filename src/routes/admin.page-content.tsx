import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { labelizeField, labelizePage, previewRouteFor } from "@/lib/page-content";

export const Route = createFileRoute("/admin/page-content")({
  component: AdminPageContent,
});

const CSS = `
.pc-wrap{max-width:820px;}
.pc-section{background:#fff;border:1px solid rgba(20,20,20,0.06);border-radius:14px;padding:26px;margin-bottom:20px;}
.pc-section h2{font-size:16px;font-weight:900;color:#181A4D;letter-spacing:-0.01em;margin:0 0 4px;}
.pc-section .pc-key{font-size:11px;color:#8a8678;margin:0 0 18px;font-family:monospace;}
.pc-section .row{margin-bottom:14px;}
.pc-section label{display:block;font-size:11.5px;font-weight:800;color:#181A4D;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:6px;}
.pc-section input, .pc-section textarea{width:100%;padding:11px 14px;border:1px solid rgba(20,20,20,0.14);border-radius:9px;font-family:'Poppins';font-size:13.5px;background:#fff;color:#20201c;box-sizing:border-box;}
.pc-section textarea{resize:vertical;min-height:100px;line-height:1.55;}
.pc-section input:focus, .pc-section textarea:focus{outline:none;border-color:#181A4D;}
.pc-actions{display:flex;gap:10px;justify-content:flex-end;margin-top:18px;padding-top:16px;border-top:1px solid rgba(20,20,20,0.08);align-items:center;flex-wrap:wrap;}
.pc-saved{font-size:12px;color:#0F4A42;font-weight:700;margin-right:auto;}
.pc-err{font-size:12px;color:#b00020;font-weight:700;margin-right:auto;}
`;

type Row = { id: string; page_key: string; field_key: string; field_value: string };

function AdminPageContent() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["admin-page-content"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("page_content")
        .select("id, page_key, field_key, field_value, created_at")
        .order("page_key", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });

  const groups = useMemo(() => {
    const g: Record<string, Row[]> = {};
    for (const r of q.data ?? []) (g[r.page_key] ??= []).push(r);
    return g;
  }, [q.data]);

  return (
    <div className="pc-wrap">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <h1 className="ad-h1">Page Content</h1>
      <p className="ad-sub">Edit static copy that appears on public pages. Changes go live immediately.</p>

      {q.isLoading && <p style={{ color: "#8a8678" }}>Loading…</p>}
      {q.error && <p style={{ color: "#b00020" }}>Failed to load: {(q.error as Error).message}</p>}

      {Object.entries(groups).map(([pageKey, rows]) => (
        <PageSection
          key={pageKey}
          pageKey={pageKey}
          rows={rows}
          onSaved={() => qc.invalidateQueries({ queryKey: ["admin-page-content"] })}
        />
      ))}

      {q.isSuccess && Object.keys(groups).length === 0 && (
        <p style={{ color: "#8a8678" }}>No page content rows exist yet.</p>
      )}
    </div>
  );
}

function PageSection({ pageKey, rows, onSaved }: { pageKey: string; rows: Row[]; onSaved: () => void }) {
  const qc = useQueryClient();
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(rows.map((r) => [r.id, r.field_value ?? ""])),
  );
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");
  const [errMsg, setErrMsg] = useState<string>("");

  useEffect(() => {
    setValues(Object.fromEntries(rows.map((r) => [r.id, r.field_value ?? ""])));
  }, [rows]);

  const save = useMutation({
    mutationFn: async () => {
      // Update only changed rows
      const changed = rows.filter((r) => (values[r.id] ?? "") !== (r.field_value ?? ""));
      for (const r of changed) {
        const { error } = await supabase
          .from("page_content")
          .update({ field_value: values[r.id] ?? "", updated_at: new Date().toISOString() })
          .eq("id", r.id);
        if (error) throw error;
      }
      return changed.length;
    },
    onSuccess: () => {
      setStatus("saved");
      setErrMsg("");
      onSaved();
      // Invalidate public-page cache so the change reflects immediately.
      qc.invalidateQueries({ queryKey: ["page-content", pageKey] });
      setTimeout(() => setStatus("idle"), 2500);
    },
    onError: (e: Error) => {
      setStatus("error");
      setErrMsg(e.message);
    },
  });

  return (
    <div className="pc-section">
      <h2>{labelizePage(pageKey)}</h2>
      <p className="pc-key">{pageKey}</p>

      {rows.map((r) => {
        const val = values[r.id] ?? "";
        const isLong = (r.field_value ?? "").length > 60 || val.length > 60;
        return (
          <div className="row" key={r.id}>
            <label>{labelizeField(r.field_key)}</label>
            {isLong ? (
              <textarea
                value={val}
                onChange={(e) => setValues((v) => ({ ...v, [r.id]: e.target.value }))}
              />
            ) : (
              <input
                type="text"
                value={val}
                onChange={(e) => setValues((v) => ({ ...v, [r.id]: e.target.value }))}
              />
            )}
          </div>
        );
      })}

      <div className="pc-actions">
        {status === "saved" && <span className="pc-saved">Saved ✓</span>}
        {status === "error" && <span className="pc-err">Error: {errMsg}</span>}
        <a
          className="ad-btn ghost"
          href={previewRouteFor(pageKey)}
          target="_blank"
          rel="noreferrer"
        >
          Preview page ↗
        </a>
        <button
          type="button"
          className="ad-btn"
          onClick={() => save.mutate()}
          disabled={save.isPending}
        >
          {save.isPending ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}
