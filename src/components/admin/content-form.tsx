import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { DevotionalPreviewModal } from "@/components/admin/devotional-preview";
import { ColorSwatches } from "@/components/admin/color-swatches";
import type { BrandColorKey } from "@/lib/brand-palette";

type Kind = "teaching" | "essay" | "podcast" | "blog" | "devotional";
type Content = Database["public"]["Tables"]["content_items"]["Row"];
type Template = Database["public"]["Tables"]["devotional_templates"]["Row"];

export const KIND_META: Record<Kind, { label: string; blurb: string; contentType: "teaching" | "essay" | "podcast" | "blog" | null }> = {
  teaching:   { label: "Teaching",   blurb: "A recorded talk or sermon — YouTube link, speaker, topic, scripture.", contentType: "teaching" },
  essay:      { label: "Essay",      blurb: "Long-form written piece with body, excerpt, and scripture reference.", contentType: "essay" },
  podcast:    { label: "Podcast",    blurb: "Audio episode — audio file or YouTube URL, guest, description.",       contentType: "podcast" },
  blog:       { label: "Blog",       blurb: "Short-form post — excerpt, body, and optional scripture.",             contentType: "blog" },
  devotional: { label: "Devotional", blurb: "Reusable practice template with Reflect / Pray / Apply prompts.",       contentType: null },
};

const FORM_CSS = `
.cf-form{background:#fff;border:1px solid rgba(20,20,20,0.06);border-radius:14px;padding:26px;margin-top:16px;max-width:820px;}
.cf-form .grid{display:grid;grid-template-columns:1fr;gap:16px;}
@media (min-width:700px){.cf-form .grid.two{grid-template-columns:1fr 1fr;}}
.cf-form label{display:block;font-size:11.5px;font-weight:800;color:#181A4D;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:6px;}
.cf-form input, .cf-form textarea, .cf-form select{width:100%;padding:11px 14px;border:1px solid rgba(20,20,20,0.14);border-radius:9px;font-family:'Poppins';font-size:13.5px;background:#fff;color:#20201c;box-sizing:border-box;}
.cf-form textarea{resize:vertical;min-height:100px;line-height:1.55;}
.cf-form textarea.tall{min-height:220px;}
.cf-form input:focus, .cf-form textarea:focus, .cf-form select:focus{outline:none;border-color:#181A4D;}
.cf-thumb{display:flex;gap:12px;align-items:center;}
.cf-thumb img{width:110px;height:70px;object-fit:cover;border-radius:8px;border:1px solid rgba(20,20,20,0.08);}
.cf-actions{display:flex;gap:10px;justify-content:flex-end;margin-top:24px;padding-top:20px;border-top:1px solid rgba(20,20,20,0.08);flex-wrap:wrap;align-items:center;}
.cf-err{background:#FFF0EC;color:#8f2600;border-left:3px solid #FF340C;padding:10px 14px;border-radius:8px;font-size:12.5px;margin-top:12px;}
.cf-note{font-size:11.5px;color:#8a8678;margin-top:6px;}
`;

type ScriptureItem = { reference: string; note: string };

// Convert an ISO timestamp to the local "YYYY-MM-DDTHH:mm" string an
// <input type="datetime-local"> expects.
function toLocalInput(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

type FormState = {
  title: string;
  excerpt: string;
  body: string;
  description: string;
  topic_id: string;
  scripture_reference: string;
  scripture_focus: string;
  author_name: string;
  media_url: string;
  thumbnail_url: string;
  published_at: string; // yyyy-mm-dd
  scheduled_at: string; // yyyy-mm-ddThh:mm (datetime-local)
  reflect_prompt: string;
  pray_prompt: string;
  apply_prompt: string;
  status: "draft" | "published";
  is_default: boolean;
  fill_mode: "pool" | "sequence";
  duration_days: string; // stored as string in the form
  scripture_items: ScriptureItem[];
  pray_items: string[];
  todo_items_pool: string[];
  accent_color: BrandColorKey | null;
  overview_text: string;
  intro_video_url: string;
  widget_heading: string;
  widget_subheading: string;
  widget_cta_label: string;
  is_featured: boolean;
};


const emptyState = (): FormState => ({
  title: "", excerpt: "", body: "", description: "", topic_id: "",
  scripture_reference: "", scripture_focus: "", author_name: "",
  media_url: "", thumbnail_url: "", published_at: "", scheduled_at: "",
  reflect_prompt: "", pray_prompt: "", apply_prompt: "",
  status: "draft", is_default: false,
  fill_mode: "pool", duration_days: "",
  scripture_items: [], pray_items: [], todo_items_pool: [],
  accent_color: null,
  overview_text: "", intro_video_url: "",
  widget_heading: "", widget_subheading: "", widget_cta_label: "Start this devotional",
  is_featured: false,
});


const stateFromContent = (r: Content): FormState => ({
  ...emptyState(),
  title: r.title,
  excerpt: r.excerpt ?? "",
  body: r.body ?? "",
  topic_id: r.topic_id ?? "",
  scripture_reference: r.scripture_reference ?? "",
  author_name: r.author_name ?? "",
  media_url: r.media_url ?? "",
  thumbnail_url: r.thumbnail_url ?? "",
  published_at: r.published_at ? r.published_at.slice(0, 10) : "",
  scheduled_at: (r as any).scheduled_at ? toLocalInput((r as any).scheduled_at) : "",
  status: r.status,
});

const stateFromTemplate = (r: Template): FormState => {
  const scr = Array.isArray((r as any).scripture_items) ? (r as any).scripture_items : [];
  const pr = Array.isArray((r as any).pray_items) ? (r as any).pray_items : [];
  const td = Array.isArray((r as any).todo_items_pool) ? (r as any).todo_items_pool : [];
  return {
    ...emptyState(),
    title: r.title,
    description: r.description ?? "",
    topic_id: r.topic_id ?? "",
    scripture_focus: r.scripture_focus ?? "",
    reflect_prompt: r.reflect_prompt ?? "",
    pray_prompt: r.pray_prompt ?? "",
    apply_prompt: r.apply_prompt ?? "",
    status: r.status,
    scheduled_at: (r as any).scheduled_at ? toLocalInput((r as any).scheduled_at) : "",
    is_default: !!(r as any).is_default,
    fill_mode: ((r as any).fill_mode === "sequence" ? "sequence" : "pool"),
    duration_days: (r as any).duration_days ? String((r as any).duration_days) : "",
    scripture_items: scr.map((it: any) => ({ reference: String(it?.reference ?? ""), note: String(it?.note ?? "") })),
    pray_items: pr.map((s: any) => String(s ?? "")),
    todo_items_pool: td.map((s: any) => String(s ?? "")),
    accent_color: ((r as any).accent_color ?? null) as BrandColorKey | null,
    overview_text: (r as any).overview_text ?? "",
    intro_video_url: (r as any).intro_video_url ?? "",
    widget_heading: (r as any).widget_heading ?? "",
    widget_subheading: (r as any).widget_subheading ?? "",
    widget_cta_label: (r as any).widget_cta_label ?? "",
    is_featured: !!(r as any).is_featured,
  };
};


export function ContentForm({
  kind,
  existingContent,
  existingTemplate,
}: {
  kind: Kind;
  existingContent?: Content;
  existingTemplate?: Template;
}) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [state, setState] = useState<FormState>(() => {
    if (existingContent) return stateFromContent(existingContent);
    if (existingTemplate) return stateFromTemplate(existingTemplate);
    return emptyState();
  });
  const [err, setErr] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const topicsQ = useQuery({
    queryKey: ["admin-topics"],
    queryFn: async () => {
      const { data, error } = await supabase.from("topics").select("id,name").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const isEdit = !!(existingContent || existingTemplate);
  const meta = KIND_META[kind];

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setState((s) => ({ ...s, [k]: v }));

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setUploading(true);
    setErr(null);
    try {
      const ext = f.name.split(".").pop() ?? "jpg";
      const path = `${kind}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("content-thumbnails").upload(path, f, { upsert: false, contentType: f.type });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("content-thumbnails").getPublicUrl(path);
      set("thumbnail_url", data.publicUrl);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const save = useMutation({
    mutationFn: async (opts: { status: "draft" | "published" }) => {
      let targetStatus = opts.status;
      if (!state.title.trim()) throw new Error("Title is required.");

      // Parse scheduled_at (datetime-local -> ISO). If it's in the future and
      // the user hit Publish/Schedule, save as draft with scheduled_at set —
      // the pg_cron job will flip it to published when the time arrives.
      const scheduledIso = state.scheduled_at ? new Date(state.scheduled_at).toISOString() : null;
      const scheduledInFuture = !!scheduledIso && new Date(scheduledIso).getTime() > Date.now();
      if (scheduledInFuture && targetStatus === "published") {
        targetStatus = "draft";
      }

      if (kind === "devotional") {
        const cleanScripture = state.scripture_items
          .map((it) => ({ reference: it.reference.trim(), note: it.note.trim() }))
          .filter((it) => it.reference || it.note);
        const cleanPray = state.pray_items.map((s) => s.trim()).filter(Boolean);
        const cleanTodo = state.todo_items_pool.map((s) => s.trim()).filter(Boolean);
        const durationDays = state.duration_days.trim() ? Math.max(1, parseInt(state.duration_days, 10) || 0) || null : null;

        const payload: Database["public"]["Tables"]["devotional_templates"]["Insert"] = {
          title: state.title.trim(),
          description: state.description || null,
          topic_id: state.topic_id || null,
          scripture_focus: state.scripture_focus || null,
          reflect_prompt: state.reflect_prompt || null,
          pray_prompt: state.pray_prompt || null,
          apply_prompt: state.apply_prompt || null,
          status: targetStatus,
          fill_mode: state.is_default ? "pool" : state.fill_mode,
          scripture_items: state.is_default ? [] : cleanScripture,
          pray_items: state.is_default ? [] : cleanPray,
          todo_items_pool: state.is_default ? [] : cleanTodo,
          duration_days: state.is_default ? null : (state.fill_mode === "sequence" ? durationDays : null),
          accent_color: state.accent_color,
        };
        (payload as any).overview_text = state.overview_text || null;
        (payload as any).intro_video_url = state.intro_video_url || null;
        (payload as any).widget_heading = state.widget_heading || null;
        (payload as any).widget_subheading = state.widget_subheading || null;
        (payload as any).widget_cta_label = state.widget_cta_label || null;
        (payload as any).is_featured = state.is_featured && targetStatus === "published";
        (payload as any).scheduled_at = scheduledIso;

        if (state.is_default && opts.status !== "published") {
          throw new Error("The platform default must be published. Publish this template or turn off the Default toggle.");
        }
        if (state.is_default && scheduledInFuture) {
          throw new Error("The platform default can't be scheduled — it must be live now.");
        }
        // If turning is_default ON, clear any existing default first (unique index enforces one).
        if (state.is_default) {
          const excludeId = existingTemplate?.id ?? "00000000-0000-0000-0000-000000000000";
          const { error: clearErr } = await supabase
            .from("devotional_templates")
            .update({ is_default: false } as any)
            .eq("is_default" as any, true)
            .neq("id", excludeId);
          if (clearErr) throw clearErr;
        }
        (payload as any).is_default = state.is_default;


        if (existingTemplate) {
          const { error } = await supabase.from("devotional_templates").update(payload).eq("id", existingTemplate.id);
          if (error) throw error;
        } else {
          const { error } = await supabase.from("devotional_templates").insert(payload);
          if (error) throw error;
        }
      } else {
        const contentType = meta.contentType!;
        const publishedAt = state.published_at
          ? new Date(state.published_at).toISOString()
          : (targetStatus === "published" ? new Date().toISOString() : null);
        const payload: Database["public"]["Tables"]["content_items"]["Insert"] = {
          type: contentType,
          title: state.title.trim(),
          excerpt: state.excerpt || null,
          body: state.body || null,
          topic_id: state.topic_id || null,
          scripture_reference: state.scripture_reference || null,
          author_name: state.author_name || null,
          media_url: state.media_url || null,
          thumbnail_url: state.thumbnail_url || null,
          published_at: publishedAt,
          status: targetStatus,
        };
        (payload as any).scheduled_at = scheduledIso;
        if (existingContent) {
          const { error } = await supabase.from("content_items").update(payload).eq("id", existingContent.id);
          if (error) throw error;
        } else {
          const { error } = await supabase.from("content_items").insert(payload);
          if (error) throw error;
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-content"] });
      qc.invalidateQueries({ queryKey: ["admin-templates"] });
      navigate({ to: "/admin/content" });
    },
    onError: (e) => setErr(e instanceof Error ? e.message : "Save failed"),
  });

  const scheduledIso = state.scheduled_at ? new Date(state.scheduled_at) : null;
  const isScheduledFuture = !!scheduledIso && !Number.isNaN(scheduledIso.getTime()) && scheduledIso.getTime() > Date.now();

  const onSubmit = (e: FormEvent, status: "draft" | "published") => {
    e.preventDefault();
    setErr(null);
    if (status === "published" && isScheduledFuture) {
      const when = scheduledIso!.toLocaleString();
      if (!window.confirm(`Schedule this to publish at ${when}?`)) return;
    }
    save.mutate({ status });
  };


  const topics = topicsQ.data ?? [];
  const showBody = kind === "essay" || kind === "blog";
  const showExcerpt = kind === "essay" || kind === "blog";
  const showDescription = kind === "teaching" || kind === "podcast" || kind === "devotional";
  const showMedia = kind === "teaching" || kind === "podcast";
  const showAuthor = kind !== "devotional";
  const showScriptureRef = kind !== "devotional";
  const showScriptureFocus = kind === "devotional";
  const showPromptBlock = kind === "devotional";
  const showThumb = kind !== "devotional";
  const showPublishedDate = kind === "essay";

  return (
    <form className="cf-form" onSubmit={(e) => onSubmit(e, "published")}>
      <style dangerouslySetInnerHTML={{ __html: FORM_CSS }} />

      <div className="grid">
        <div>
          <label>Title *</label>
          <input required value={state.title} onChange={(e) => set("title", e.target.value)} />
        </div>

        <div className="grid two">
          <div>
            <label>Topic</label>
            <select value={state.topic_id} onChange={(e) => set("topic_id", e.target.value)}>
              <option value="">— None —</option>
              {topics.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          {showAuthor && (
            <div>
              <label>{kind === "podcast" ? "Guest / speaker" : "Author / speaker"}</label>
              <input value={state.author_name} onChange={(e) => set("author_name", e.target.value)} />
            </div>
          )}
        </div>

        {showExcerpt && (
          <div>
            <label>Excerpt</label>
            <textarea value={state.excerpt} onChange={(e) => set("excerpt", e.target.value)} rows={2} />
            <div className="cf-note">One or two sentences shown in feeds and cards.</div>
          </div>
        )}

        {showDescription && (
          <div>
            <label>{kind === "podcast" ? "Episode description" : "Description"}</label>
            <textarea value={state.description || state.excerpt} onChange={(e) => {
              set("description", e.target.value);
              set("excerpt", e.target.value);
            }} rows={3} />
          </div>
        )}

        {(showScriptureRef || showScriptureFocus) && (
          <div>
            <label>{showScriptureFocus ? "Scripture focus" : "Scripture reference"}{kind === "podcast" ? " (optional)" : ""}</label>
            <input
              placeholder="e.g. John 15:4"
              value={showScriptureFocus ? state.scripture_focus : state.scripture_reference}
              onChange={(e) => set(showScriptureFocus ? "scripture_focus" : "scripture_reference", e.target.value)}
            />
          </div>
        )}

        {showMedia && (
          <div>
            <label>{kind === "teaching" ? "YouTube URL" : "Audio file or YouTube URL"}</label>
            <input placeholder="https://…" value={state.media_url} onChange={(e) => set("media_url", e.target.value)} />
          </div>
        )}

        {showBody && (
          <div>
            <label>Full body</label>
            <textarea className="tall" value={state.body} onChange={(e) => set("body", e.target.value)} placeholder="Write the full piece here. Blank lines separate paragraphs. Markdown for **bold**, *italic*, and [links](https://) is supported." />
            <div className="cf-note">Markdown supported. Blank lines separate paragraphs.</div>
          </div>
        )}

        {showPublishedDate && (
          <div>
            <label>Published date</label>
            <input type="date" value={state.published_at} onChange={(e) => set("published_at", e.target.value)} />
            <div className="cf-note">Leave blank to use the current date when you publish.</div>
          </div>
        )}

        <div>
          <label>Scheduled release (optional)</label>
          <input
            type="datetime-local"
            value={state.scheduled_at}
            onChange={(e) => set("scheduled_at", e.target.value)}
          />
          <div className="cf-note">
            Leave blank to publish immediately when you hit Publish. If set, this item publishes automatically at this date and time.
            {state.scheduled_at && (
              <button
                type="button"
                onClick={() => set("scheduled_at", "")}
                style={{ marginLeft: 8, background: "none", border: "none", color: "#8f2600", fontFamily: "Poppins", fontWeight: 700, fontSize: 11.5, cursor: "pointer", padding: 0 }}
              >Clear</button>
            )}
          </div>
        </div>

        {showPromptBlock && (
          <>
            <div>
              <label>Reflect prompt</label>
              <textarea rows={3} value={state.reflect_prompt} onChange={(e) => set("reflect_prompt", e.target.value)} placeholder="What does this passage stir in you today?" />
            </div>
            <div>
              <label>Pray prompt</label>
              <textarea rows={3} value={state.pray_prompt} onChange={(e) => set("pray_prompt", e.target.value)} placeholder="Write a prayer in response to what you noticed." />
            </div>
            <div>
              <label>Apply prompt</label>
              <textarea rows={3} value={state.apply_prompt} onChange={(e) => set("apply_prompt", e.target.value)} placeholder="What is one small step you can take today?" />
            </div>
          </>
        )}

        {kind === "devotional" && (
          <div style={{ background: "#FBF8ED", border: "1px solid rgba(15,74,66,0.15)", borderRadius: 10, padding: "14px 16px" }}>
            <label style={{ display: "flex", alignItems: "flex-start", gap: 10, textTransform: "none", letterSpacing: 0, fontSize: 13.5, fontWeight: 700, color: "#181A4D", cursor: "pointer", margin: 0 }}>
              <input
                type="checkbox"
                checked={state.is_default}
                onChange={(e) => set("is_default", e.target.checked)}
                style={{ width: "auto", marginTop: 3 }}
              />
              <span>
                Platform Default Devotional
                <div className="cf-note" style={{ marginTop: 4, fontWeight: 500 }}>
                  Every user automatically has this template active. Only one template can be the default at a time — turning this on will remove the flag from the current default. The default must be published.
                </div>
              </span>
            </label>
          </div>
        )}

        {kind === "devotional" && (
          <div>
            <label>Color</label>
            <ColorSwatches value={state.accent_color} onChange={(v) => set("accent_color", v)} />
            <div className="cf-note">Used as a small accent — icon background, left border, or tag chip — wherever this devotional appears.</div>
          </div>
        )}


        {kind === "devotional" && !state.is_default && (
          <AutoFillEditor state={state} setState={setState} />
        )}

        {kind === "devotional" && existingTemplate && !state.is_default && (
          <DayOverrides template={existingTemplate} state={state} />
        )}


        {showThumb && (
          <div>
            <label>Thumbnail image</label>
            <div className="cf-thumb">
              {state.thumbnail_url && <img src={state.thumbnail_url} alt="" />}
              <input type="file" accept="image/*" onChange={onFile} disabled={uploading} />
              {state.thumbnail_url && (
                <button type="button" className="ad-btn ghost sm" onClick={() => set("thumbnail_url", "")}>Remove</button>
              )}
            </div>
            {uploading && <div className="cf-note">Uploading…</div>}
          </div>
        )}
      </div>

      {err && <div className="cf-err">{err}</div>}

      <div className="cf-actions">
        <span style={{ marginRight: "auto", fontSize: 12, color: "#8a8678" }}>
          {isEdit ? `Currently ${state.status}` : "New item starts as draft unless you publish"}
        </span>
        <button type="button" className="ad-btn ghost" onClick={() => navigate({ to: "/admin/content" })}>Cancel</button>
        {kind === "devotional" && existingTemplate && !state.is_default && (
          <button type="button" className="ad-btn ghost" onClick={() => setPreviewOpen(true)}>
            Preview
          </button>
        )}
        <button type="button" className="ad-btn ghost" onClick={(e) => onSubmit(e, "draft")} disabled={save.isPending || uploading}>
          {save.isPending ? "Saving…" : "Save draft"}
        </button>
        <button type="submit" className="ad-btn" disabled={save.isPending || uploading}>
          {save.isPending
            ? (isScheduledFuture ? "Scheduling…" : "Publishing…")
            : isScheduledFuture
              ? "Schedule"
              : (state.status === "published" && isEdit ? "Save & keep published" : "Publish")}
        </button>
      </div>

      {previewOpen && existingTemplate && (
        <DevotionalPreviewModal
          template={existingTemplate}
          formState={{
            title: state.title,
            description: state.description,
            scripture_focus: state.scripture_focus,
            reflect_prompt: state.reflect_prompt,
            pray_prompt: state.pray_prompt,
            apply_prompt: state.apply_prompt,
            fill_mode: state.fill_mode,
            duration_days: state.duration_days,
            scripture_items: state.scripture_items,
            pray_items: state.pray_items,
            todo_items_pool: state.todo_items_pool,
          }}
          onClose={() => setPreviewOpen(false)}
        />
      )}
    </form>
  );
}

function AutoFillEditor({
  state,
  setState,
}: {
  state: FormState;
  setState: React.Dispatch<React.SetStateAction<FormState>>;
}) {
  const patch = (p: Partial<FormState>) => setState((s) => ({ ...s, ...p }));

  const updateScr = (idx: number, key: keyof ScriptureItem, v: string) =>
    patch({ scripture_items: state.scripture_items.map((it, i) => (i === idx ? { ...it, [key]: v } : it)) });
  const addScr = () => patch({ scripture_items: [...state.scripture_items, { reference: "", note: "" }] });
  const removeScr = (idx: number) => patch({ scripture_items: state.scripture_items.filter((_, i) => i !== idx) });
  const moveScr = (idx: number, dir: -1 | 1) => {
    const next = [...state.scripture_items];
    const j = idx + dir;
    if (j < 0 || j >= next.length) return;
    [next[idx], next[j]] = [next[j], next[idx]];
    patch({ scripture_items: next });
  };

  const updateStr = (key: "pray_items" | "todo_items_pool") => (idx: number, v: string) =>
    patch({ [key]: state[key].map((s, i) => (i === idx ? v : s)) } as any);
  const addStr = (key: "pray_items" | "todo_items_pool") => () =>
    patch({ [key]: [...state[key], ""] } as any);
  const removeStr = (key: "pray_items" | "todo_items_pool") => (idx: number) =>
    patch({ [key]: state[key].filter((_, i) => i !== idx) } as any);
  const moveStr = (key: "pray_items" | "todo_items_pool") => (idx: number, dir: -1 | 1) => {
    const next = [...state[key]];
    const j = idx + dir;
    if (j < 0 || j >= next.length) return;
    [next[idx], next[j]] = [next[j], next[idx]];
    patch({ [key]: next } as any);
  };

  const rowBtnStyle: React.CSSProperties = {
    background: "none", border: "1px solid rgba(20,20,20,0.14)", borderRadius: 6,
    padding: "4px 8px", fontSize: 11, cursor: "pointer", color: "#181A4D", fontFamily: "Poppins", fontWeight: 700,
  };

  const StringList = ({
    label, items, placeholder, onUpdate, onAdd, onRemove, onMove,
  }: {
    label: string; items: string[]; placeholder: string;
    onUpdate: (idx: number, v: string) => void;
    onAdd: () => void; onRemove: (idx: number) => void;
    onMove: (idx: number, dir: -1 | 1) => void;
  }) => (
    <div>
      <label>{label}</label>
      {items.length === 0 && <div className="cf-note" style={{ marginBottom: 8 }}>No items yet.</div>}
      {items.map((v, i) => (
        <div key={i} style={{ display: "flex", gap: 6, marginBottom: 6, alignItems: "flex-start" }}>
          <textarea rows={2} value={v} placeholder={placeholder} onChange={(e) => onUpdate(i, e.target.value)} style={{ flex: 1 }} />
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <button type="button" style={rowBtnStyle} onClick={() => onMove(i, -1)} aria-label="Move up">↑</button>
            <button type="button" style={rowBtnStyle} onClick={() => onMove(i, 1)} aria-label="Move down">↓</button>
            <button type="button" style={{ ...rowBtnStyle, color: "#8f2600" }} onClick={() => onRemove(i)} aria-label="Remove">×</button>
          </div>
        </div>
      ))}
      <button type="button" className="ad-btn ghost sm" onClick={onAdd}>+ Add</button>
    </div>
  );

  return (
    <div style={{ background: "#FBF8ED", border: "1px solid rgba(15,74,66,0.15)", borderRadius: 10, padding: "18px 20px", display: "grid", gap: 18 }}>
      <div>
        <div style={{ fontSize: 13.5, fontWeight: 800, color: "#181A4D", marginBottom: 4 }}>Daily auto-fill content</div>
        <div className="cf-note" style={{ marginTop: 0 }}>
          When a user opens today's entry for this devotional, Read and Pray pre-populate from these lists. To-do pre-fills too when a prompt is configured for the day. Everything remains editable — this is a starting point, not a locked field.
        </div>
      </div>

      <div className="grid two">
        <div>
          <label>Fill mode</label>
          <select value={state.fill_mode} onChange={(e) => patch({ fill_mode: e.target.value as "pool" | "sequence" })}>
            <option value="pool">Rotating pool (open-ended topical)</option>
            <option value="sequence">Fixed sequence (multi-day series)</option>
          </select>
          <div className="cf-note">Pool rotates through items day by day. Sequence walks the list in order and stops at the last item.</div>
        </div>
        {state.fill_mode === "sequence" && (
          <div>
            <label>Duration (days, optional)</label>
            <input type="number" min={1} value={state.duration_days} onChange={(e) => patch({ duration_days: e.target.value })} placeholder="e.g. 7" />
            <div className="cf-note">Leave blank to run for as many days as items provided.</div>
          </div>
        )}
      </div>

      <div>
        <label>Scripture readings</label>
        <div className="cf-note" style={{ marginBottom: 8 }}>Each item: a passage reference and an optional short reading note.</div>
        {state.scripture_items.length === 0 && <div className="cf-note">No scripture items yet.</div>}
        {state.scripture_items.map((it, i) => (
          <div key={i} style={{ display: "flex", gap: 6, marginBottom: 8, alignItems: "flex-start" }}>
            <div style={{ flex: 1, display: "grid", gap: 6 }}>
              <input placeholder="Reference — e.g. Matthew 4:1–11" value={it.reference} onChange={(e) => updateScr(i, "reference", e.target.value)} />
              <textarea rows={2} placeholder="Short reading note (optional)" value={it.note} onChange={(e) => updateScr(i, "note", e.target.value)} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <button type="button" style={rowBtnStyle} onClick={() => moveScr(i, -1)}>↑</button>
              <button type="button" style={rowBtnStyle} onClick={() => moveScr(i, 1)}>↓</button>
              <button type="button" style={{ ...rowBtnStyle, color: "#8f2600" }} onClick={() => removeScr(i)}>×</button>
            </div>
          </div>
        ))}
        <button type="button" className="ad-btn ghost sm" onClick={addScr}>+ Add scripture</button>
      </div>

      <StringList
        label="Prayer prompts"
        placeholder="e.g. Ask God where you're avoiding surrender today."
        items={state.pray_items}
        onUpdate={updateStr("pray_items")}
        onAdd={addStr("pray_items")}
        onRemove={removeStr("pray_items")}
        onMove={moveStr("pray_items")}
      />

      <StringList
        label="To-do prompts (optional)"
        placeholder="e.g. Fast from one meal today and give what you'd have spent."
        items={state.todo_items_pool}
        onUpdate={updateStr("todo_items_pool")}
        onAdd={addStr("todo_items_pool")}
        onRemove={removeStr("todo_items_pool")}
        onMove={moveStr("todo_items_pool")}
      />
    </div>
  );
}


type DayFields = {
  focus_preview: string;
  reflect_prompt: string;
  pray_prompt: string;
  apply_prompt: string;
  scripture_reference: string;
  scripture_note: string;
};

const emptyDay = (): DayFields => ({
  focus_preview: "", reflect_prompt: "", pray_prompt: "",
  apply_prompt: "", scripture_reference: "", scripture_note: "",
});

function DayOverrides({ template, state }: { template: Template; state: FormState }) {
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState<number | null>(null);
  const [drafts, setDrafts] = useState<Record<number, DayFields>>({});
  const [busy, setBusy] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const duration = Math.max(0, parseInt(state.duration_days, 10) || 0);

  const daysQ = useQuery({
    queryKey: ["devotional-days", template.id],
    queryFn: async () => {
      const { data, error } = await (supabase.from as any)("devotional_days")
        .select("*")
        .eq("template_id", template.id)
        .order("day_number", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Array<{
        id: string; day_number: number; is_override: boolean;
        focus_preview: string | null; reflect_prompt: string | null;
        pray_prompt: string | null; apply_prompt: string | null;
        scripture_reference: string | null; scripture_note: string | null;
      }>;
    },
  });

  const byDay = useMemo(() => {
    const m = new Map<number, (typeof daysQ.data extends (infer U)[] | undefined ? U : never)>();
    for (const r of daysQ.data ?? []) m.set(r.day_number, r as any);
    return m;
  }, [daysQ.data]);

  // For "default sequence content for that day, shown for reference":
  // pull from template.scripture_items (index = day-1) plus template-level prompts.
  const defaultsFor = (day: number): DayFields => {
    const scr = state.scripture_items[day - 1];
    return {
      focus_preview: "",
      reflect_prompt: state.reflect_prompt || "",
      pray_prompt: state.pray_prompt || "",
      apply_prompt: state.apply_prompt || "",
      scripture_reference: scr?.reference || "",
      scripture_note: scr?.note || "",
    };
  };

  const liveFor = (day: number): DayFields => {
    const row = byDay.get(day);
    if (row && row.is_override) {
      return {
        focus_preview: row.focus_preview ?? "",
        reflect_prompt: row.reflect_prompt ?? "",
        pray_prompt: row.pray_prompt ?? "",
        apply_prompt: row.apply_prompt ?? "",
        scripture_reference: row.scripture_reference ?? "",
        scripture_note: row.scripture_note ?? "",
      };
    }
    return defaultsFor(day);
  };

  const expand = (day: number) => {
    if (expanded === day) { setExpanded(null); return; }
    setErr(null);
    setDrafts((d) => ({ ...d, [day]: d[day] ?? liveFor(day) }));
    setExpanded(day);
  };

  const patchDraft = (day: number, patch: Partial<DayFields>) =>
    setDrafts((d) => ({ ...d, [day]: { ...(d[day] ?? liveFor(day)), ...patch } }));

  const save = async (day: number) => {
    setBusy(day); setErr(null);
    try {
      const v = drafts[day] ?? liveFor(day);
      const existing = byDay.get(day);
      const payload: any = {
        template_id: template.id,
        day_number: day,
        title: `Day ${day}`,
        medium: "text",
        is_override: true,
        focus_preview: v.focus_preview || null,
        reflect_prompt: v.reflect_prompt || null,
        pray_prompt: v.pray_prompt || null,
        apply_prompt: v.apply_prompt || null,
        scripture_reference: v.scripture_reference || null,
        scripture_note: v.scripture_note || null,
      };
      if (existing) {
        const { error } = await (supabase.from as any)("devotional_days")
          .update(payload).eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase.from as any)("devotional_days").insert(payload);
        if (error) throw error;
      }
      await qc.invalidateQueries({ queryKey: ["devotional-days", template.id] });
      setExpanded(null);
      setDrafts((d) => { const n = { ...d }; delete n[day]; return n; });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Save failed");
    } finally { setBusy(null); }
  };

  const revert = async (day: number) => {
    const existing = byDay.get(day);
    if (!existing) return;
    if (!window.confirm(`Revert Day ${day} to the default sequence content?`)) return;
    setBusy(day); setErr(null);
    try {
      const { error } = await (supabase.from as any)("devotional_days")
        .delete().eq("id", existing.id);
      if (error) throw error;
      await qc.invalidateQueries({ queryKey: ["devotional-days", template.id] });
      setExpanded(null);
      setDrafts((d) => { const n = { ...d }; delete n[day]; return n; });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Revert failed");
    } finally { setBusy(null); }
  };

  const chipStyle = (overridden: boolean): React.CSSProperties => ({
    fontSize: 10.5, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase",
    padding: "3px 9px", borderRadius: 99,
    background: overridden ? "#DCE07A" : "rgba(20,20,20,0.06)",
    color: overridden ? "#181A4D" : "#8a8678",
  });
  const rowStyle: React.CSSProperties = {
    display: "flex", alignItems: "center", gap: 12,
    padding: "10px 12px", borderTop: "1px solid rgba(20,20,20,0.08)",
  };
  const editBtnStyle: React.CSSProperties = {
    marginLeft: "auto", background: "transparent",
    border: "1px solid rgba(20,20,20,0.14)", borderRadius: 8,
    padding: "5px 12px", fontSize: 11.5, fontWeight: 700,
    color: "#181A4D", cursor: "pointer", fontFamily: "Poppins",
  };

  return (
    <div style={{ background: "#FBF8ED", border: "1px solid rgba(15,74,66,0.15)", borderRadius: 10, padding: "18px 20px", display: "grid", gap: 12 }}>
      <div>
        <div style={{ fontSize: 13.5, fontWeight: 800, color: "#181A4D", marginBottom: 4 }}>Day-by-day overrides</div>
        <div className="cf-note" style={{ marginTop: 0 }}>
          Every devotional follows a fixed sequence by default. Override any specific day with custom prompts, scripture, and a focus preview. Non-overridden days stay in sync with the auto-fill content above.
        </div>
      </div>

      {duration === 0 && (
        <div className="cf-note">Set a duration (in the Daily auto-fill content section above) to enable per-day overrides.</div>
      )}
      {duration > 0 && daysQ.isLoading && <div className="cf-note">Loading days…</div>}
      {err && <div className="cf-err">{err}</div>}

      {duration > 0 && !daysQ.isLoading && (
        <div style={{ background: "#fff", border: "1px solid rgba(20,20,20,0.08)", borderRadius: 8 }}>
          {Array.from({ length: duration }, (_, i) => i + 1).map((day) => {
            const existing = byDay.get(day);
            const overridden = !!existing?.is_override;
            const isOpen = expanded === day;
            const draft = drafts[day] ?? liveFor(day);
            const def = defaultsFor(day);
            return (
              <div key={day} style={{ borderTop: day === 1 ? "none" : undefined }}>
                <div style={{ ...rowStyle, borderTop: day === 1 ? "none" : rowStyle.borderTop }}>
                  <div style={{ fontWeight: 800, color: "#181A4D", fontSize: 13.5, minWidth: 62 }}>Day {day}</div>
                  <span style={chipStyle(overridden)}>{overridden ? "Overridden" : "Default"}</span>
                  <button type="button" style={editBtnStyle} onClick={() => expand(day)} disabled={busy === day}>
                    {isOpen ? "Close" : "Edit"}
                  </button>
                </div>
                {isOpen && (
                  <div style={{ padding: "6px 14px 16px", display: "grid", gap: 14, background: "#fff" }}>
                    <div>
                      <label>Focus preview</label>
                      <input
                        value={draft.focus_preview}
                        onChange={(e) => patchDraft(day, { focus_preview: e.target.value })}
                        placeholder="A teaser, not a summary."
                      />
                      <div className="cf-note">A teaser, not a summary. Shown on the collapsed day row on the public overview page — keep it spoiler-free.</div>
                    </div>
                    <div>
                      <label>Reflect prompt</label>
                      <textarea rows={3} value={draft.reflect_prompt} onChange={(e) => patchDraft(day, { reflect_prompt: e.target.value })} placeholder="What does this passage stir in you today?" />
                      {!overridden && def.reflect_prompt && (
                        <div className="cf-note">Default: {def.reflect_prompt}</div>
                      )}
                    </div>
                    <div>
                      <label>Pray prompt</label>
                      <textarea rows={3} value={draft.pray_prompt} onChange={(e) => patchDraft(day, { pray_prompt: e.target.value })} placeholder="Write a prayer in response to what you noticed." />
                      {!overridden && def.pray_prompt && (
                        <div className="cf-note">Default: {def.pray_prompt}</div>
                      )}
                    </div>
                    <div>
                      <label>Apply prompt</label>
                      <textarea rows={3} value={draft.apply_prompt} onChange={(e) => patchDraft(day, { apply_prompt: e.target.value })} placeholder="What is one small step you can take today?" />
                      {!overridden && def.apply_prompt && (
                        <div className="cf-note">Default: {def.apply_prompt}</div>
                      )}
                    </div>
                    <div className="grid two" style={{ display: "grid", gridTemplateColumns: "1fr", gap: 14 }}>
                      <div>
                        <label>Scripture reference</label>
                        <input value={draft.scripture_reference} onChange={(e) => patchDraft(day, { scripture_reference: e.target.value })} placeholder="e.g. Matthew 4:1–11" />
                        {!overridden && def.scripture_reference && (
                          <div className="cf-note">Default: {def.scripture_reference}</div>
                        )}
                      </div>
                      <div>
                        <label>Scripture note</label>
                        <textarea rows={2} value={draft.scripture_note} onChange={(e) => patchDraft(day, { scripture_note: e.target.value })} placeholder="Short reading note (optional)" />
                        {!overridden && def.scripture_note && (
                          <div className="cf-note">Default: {def.scripture_note}</div>
                        )}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", flexWrap: "wrap" }}>
                      {overridden && (
                        <button
                          type="button"
                          className="ad-btn ghost sm"
                          onClick={() => revert(day)}
                          disabled={busy === day}
                          style={{ marginRight: "auto", color: "#8f2600", borderColor: "rgba(143,38,0,0.3)" }}
                        >
                          Revert to default
                        </button>
                      )}
                      <button type="button" className="ad-btn ghost sm" onClick={() => { setExpanded(null); setDrafts((d) => { const n = { ...d }; delete n[day]; return n; }); }} disabled={busy === day}>
                        Cancel
                      </button>
                      <button type="button" className="ad-btn sm" onClick={() => save(day)} disabled={busy === day}>
                        {busy === day ? "Saving…" : "Save override"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}


// util for callers to import kind list
export const KIND_LIST: Kind[] = ["teaching", "essay", "podcast", "blog", "devotional"];
export type { Kind };

