import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

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
  reflect_prompt: string;
  pray_prompt: string;
  apply_prompt: string;
  status: "draft" | "published";
  is_default: boolean;
};

const emptyState = (): FormState => ({
  title: "", excerpt: "", body: "", description: "", topic_id: "",
  scripture_reference: "", scripture_focus: "", author_name: "",
  media_url: "", thumbnail_url: "", published_at: "",
  reflect_prompt: "", pray_prompt: "", apply_prompt: "",
  status: "draft", is_default: false,
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
  status: r.status,
});

const stateFromTemplate = (r: Template): FormState => ({
  ...emptyState(),
  title: r.title,
  description: r.description ?? "",
  topic_id: r.topic_id ?? "",
  scripture_focus: r.scripture_focus ?? "",
  reflect_prompt: r.reflect_prompt ?? "",
  pray_prompt: r.pray_prompt ?? "",
  apply_prompt: r.apply_prompt ?? "",
  status: r.status,
  is_default: !!(r as any).is_default,
});

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
      const targetStatus = opts.status;
      if (!state.title.trim()) throw new Error("Title is required.");

      if (kind === "devotional") {
        const payload: Database["public"]["Tables"]["devotional_templates"]["Insert"] = {
          title: state.title.trim(),
          description: state.description || null,
          topic_id: state.topic_id || null,
          scripture_focus: state.scripture_focus || null,
          reflect_prompt: state.reflect_prompt || null,
          pray_prompt: state.pray_prompt || null,
          apply_prompt: state.apply_prompt || null,
          status: targetStatus,
        };

        if (state.is_default && targetStatus !== "published") {
          throw new Error("The platform default must be published. Publish this template or turn off the Default toggle.");
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

  const onSubmit = (e: FormEvent, status: "draft" | "published") => {
    e.preventDefault();
    setErr(null);
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
        <button type="button" className="ad-btn ghost" onClick={(e) => onSubmit(e, "draft")} disabled={save.isPending || uploading}>
          {save.isPending ? "Saving…" : "Save draft"}
        </button>
        <button type="submit" className="ad-btn" disabled={save.isPending || uploading}>
          {save.isPending ? "Publishing…" : (state.status === "published" && isEdit ? "Save & keep published" : "Publish")}
        </button>
      </div>
    </form>
  );
}

// util for callers to import kind list
export const KIND_LIST: Kind[] = ["teaching", "essay", "podcast", "blog", "devotional"];
export type { Kind };
