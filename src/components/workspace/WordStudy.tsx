import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useStudyFolderList } from "@/components/workspace/StudyFolders";
import { WorkspaceEditor } from "@/components/workspace/WorkspaceEditor";
import { DeleteConfirmModal } from "@/components/DeleteConfirmModal";
import {
  deleteWordStudy, invalidateWordBank, LANG_LABEL, linkAnnotation, matchWordStudies, useWordRefs, useWordStudies,
  wordSubline, type WordLanguage, type WordRef, type WordStudy,
} from "@/lib/word-bank";

export type DocMeta = { id: string; title: string; folder_id: string | null; kind: string };

/** Titles and folders of the user's documents, for "From …" lines and reference rows. */
export function useDocMeta(userId: string | null | undefined) {
  const folders = useStudyFolderList(userId ?? null);
  const docs = useQuery({
    queryKey: ["word-bank-docs", userId ?? ""],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from("workspace_items").select("id,title,folder_id,kind").eq("user_id", userId!);
      if (error) throw error;
      return (data ?? []) as DocMeta[];
    },
  });
  return useMemo(() => {
    const byId = new Map((docs.data ?? []).map((d) => [d.id, d]));
    const folderName = (id: string | null | undefined) => (id ? (folders.data ?? []).find((f) => f.id === id)?.name : undefined);
    return {
      doc: (id: string) => byId.get(id),
      title: (id: string) => byId.get(id)?.title?.trim() || "Untitled study",
      folder: (id: string) => folderName(byId.get(id)?.folder_id),
      folderName,
      folders: folders.data ?? [],
    };
  }, [docs.data, folders.data]);
}

export const WORD_CSS = `
.wsd-bg{position:fixed;inset:0;z-index:2100;background:rgba(24,26,77,0.32);}
.wsd{position:fixed;z-index:2101;background:#fff;color:#181A4D;box-sizing:border-box;overflow-y:auto;overscroll-behavior:contain;font-family:inherit;}
.wsd.side{top:0;right:0;bottom:0;width:min(460px,100vw);box-shadow:-12px 0 34px rgba(24,26,77,0.2);padding:22px 24px 32px;}
.wsd.sheet{left:0;right:0;bottom:0;height:90vh;border-radius:20px 20px 0 0;box-shadow:0 -12px 34px rgba(24,26,77,0.2);padding:10px 18px calc(env(safe-area-inset-bottom,0px) + 28px);}
.wsd-grab{width:42px;height:5px;border-radius:999px;background:#E3DCC6;margin:0 auto 10px;}
.wsd-top{display:flex;align-items:center;justify-content:space-between;gap:10px;}
.wsd-x{width:34px;height:34px;border-radius:50%;border:1px solid #ECE4CE;background:#fff;color:#181A4D;font-size:18px;line-height:1;cursor:pointer;flex-shrink:0;}
.wsd-pill{display:inline-block;background:#FFE3A3;color:#5c3d00;font-size:10.5px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;padding:4px 10px;border-radius:999px;}
.wsd-term{font-family:'Archivo Black','Poppins',sans-serif;font-size:32px;line-height:1.1;color:#181A4D;margin:14px 0 4px;overflow-wrap:anywhere;}
.wsd-from{font-size:12.5px;color:rgba(24,26,77,0.6);margin-bottom:16px;}
.wsd-sugg{background:#FFF8E6;border:1px solid #F5D58C;border-radius:12px;padding:10px 12px;margin:0 0 16px;font-size:13px;line-height:1.45;}
.wsd-sugg button{display:inline;background:none;border:none;padding:0;font:inherit;font-weight:700;color:#8a5a00;text-decoration:underline;cursor:pointer;margin-left:4px;}
.wsd-row{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
.wsd label{display:block;font-size:10.5px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:rgba(24,26,77,0.6);margin:0 0 12px;}
.wsd input,.wsd textarea,.wsd select{display:block;width:100%;box-sizing:border-box;margin-top:5px;border:1.5px solid #ECE4CE;border-radius:10px;padding:9px 11px;font:inherit;font-size:14px;letter-spacing:normal;text-transform:none;font-weight:400;color:#181A4D;background:#fff;outline:none;}
.wsd input:focus,.wsd textarea:focus,.wsd select:focus{border-color:#181A4D;}
.wsd textarea{min-height:70px;resize:vertical;}
.wsd-notes{margin-top:5px;border:1.5px solid #ECE4CE;border-radius:10px;background:#FFFDF6;padding:4px 8px;min-height:120px;text-transform:none;letter-spacing:normal;font-weight:400;}
.wsd-notes .ws-editor-wrap,.wsd-notes .ws-editor-content{background:transparent;}
.wsd-save{display:block;width:100%;border:none;border-radius:999px;background:#181A4D;color:#fff;font:inherit;font-size:15px;font-weight:700;padding:13px 18px;cursor:pointer;margin-top:6px;}
.wsd-save:disabled{opacity:.5;cursor:default;}
.wsd-help{font-size:12px;color:rgba(24,26,77,0.55);text-align:center;margin-top:8px;}
.wc{color:#181A4D;}
.wc-term{font-family:'Archivo Black','Poppins',sans-serif;font-size:34px;line-height:1.08;margin:12px 0 6px;overflow-wrap:anywhere;}
.wc-meta{display:flex;flex-wrap:wrap;gap:6px 12px;align-items:baseline;font-size:13px;color:rgba(24,26,77,0.65);}
.wc-meta .scr{font-size:22px;color:#181A4D;}
.wc-meta .tr{font-style:italic;}
.wc-sec{font-size:10.5px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:#8a8678;margin:22px 0 8px;}
.wc-mean{font-size:15px;line-height:1.55;white-space:pre-wrap;}
.wc-acts{display:flex;gap:8px;margin-left:auto;}
.wc-btn{border:1.5px solid #ECE4CE;background:#fff;color:#181A4D;border-radius:999px;font:inherit;font-size:12.5px;font-weight:700;padding:6px 13px;cursor:pointer;}
.wc-btn:hover{border-color:#181A4D;}
.wc-btn.del{color:#B3261E;}
.wc-ref{display:flex;gap:10px;align-items:flex-start;padding:11px 0;border-top:1px solid #F0EAD8;}
.wc-ref:first-of-type{border-top:none;}
.wc-ref .dot{width:8px;height:8px;border-radius:50%;background:#E08F00;margin-top:6px;flex-shrink:0;}
.wc-ref .t{font-size:14px;font-weight:700;}
.wc-ref .q{font-size:12.5px;color:rgba(24,26,77,0.62);margin-top:2px;overflow-wrap:anywhere;}
.wc-ref .op{margin-left:auto;background:none;border:none;font:inherit;font-size:13px;font-weight:700;color:#0F4A42;cursor:pointer;white-space:nowrap;padding:0;}
`;

const useIsPhone = () => {
  const [m, setM] = useState(false);
  useEffect(() => { const q = window.matchMedia("(max-width: 899px)"); const f = () => setM(q.matches); f(); q.addEventListener("change", f); return () => q.removeEventListener("change", f); }, []);
  return m;
};

export type SheetAnno = { id: string; quote: string; workspace_item_id: string; word_study_id?: string | null; reference?: string | null };

/** "Study this word" sheet: create a word study (or link to an existing one), or edit an existing word. */
export function WordSheet({ userId, anno, word, onClose, onLinked }: {
  userId: string;
  anno?: SheetAnno | null;
  word?: WordStudy | null;
  onClose: () => void;
  onLinked?: (wordId: string) => void;
}) {
  const qc = useQueryClient();
  const phone = useIsPhone();
  const meta = useDocMeta(userId);
  const words = useWordStudies(userId).data ?? [];
  const [term, setTerm] = useState(word?.term ?? anno?.quote ?? "");
  const [original, setOriginal] = useState(word?.original ?? "");
  const [script, setScript] = useState(word?.original_script ?? "");
  const [strongs, setStrongs] = useState(word?.strongs ?? "");
  const [language, setLanguage] = useState<WordLanguage | "">(word?.language ?? "");
  const [pos, setPos] = useState(word?.part_of_speech ?? "");
  const [meaning, setMeaning] = useState(word?.meaning ?? "");
  const [reference, setReference] = useState(anno?.reference ?? "");
  const notes = useRef<{ json: any; text: string }>({ json: word?.notes ?? null, text: word?.notes_text ?? "" });
  const [busy, setBusy] = useState(false);

  const suggestion = !word ? matchWordStudies(words, term, strongs)[0] : undefined;
  const from = anno ? [meta.title(anno.workspace_item_id), meta.folder(anno.workspace_item_id)].filter(Boolean).join(" · ") : "";

  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k);
  }, [onClose]);

  const linkTo = async (w: WordStudy) => {
    if (!anno) return;
    setBusy(true);
    try {
      await linkAnnotation(anno.id, w.id);
      if (reference.trim()) await supabase.from("doc_annotations").update({ reference: reference.trim() }).eq("id", anno.id);
      invalidateWordBank(qc, userId);
      onLinked?.(w.id);
      toast.success(`Linked to “${w.term}” in your word bank`);
      onClose();
    } catch (e) { console.error(e); toast.error("Couldn't link that word. Try again."); }
    finally { setBusy(false); }
  };

  const save = async () => {
    if (!term.trim()) return;
    setBusy(true);
    const fields = {
      term: term.trim(), original: original.trim(), original_script: script.trim() || null, strongs: strongs.trim() || null,
      language: (language || null) as WordLanguage | null, part_of_speech: pos.trim() || null, meaning: meaning.trim(),
      notes: notes.current.json, notes_text: notes.current.text,
    };
    try {
      if (word) {
        const { error } = await supabase.from("word_studies").update(fields).eq("id", word.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("word_studies").insert({ ...fields, user_id: userId }).select("id").single();
        if (error) throw error;
        if (anno) {
          const u = await supabase.from("doc_annotations").update({ word_study_id: data.id, reference: reference.trim() || null }).eq("id", anno.id);
          if (u.error) throw u.error;
          onLinked?.(data.id);
        }
      }
      invalidateWordBank(qc, userId);
      toast.success(word ? "Word updated" : "Saved to your word bank");
      onClose();
    } catch (e) { console.error(e); toast.error("Couldn't save this word. Try again."); }
    finally { setBusy(false); }
  };

  return createPortal(
    <>
      <style>{WORD_CSS}</style>
      <div className="wsd-bg" onClick={onClose} />
      <div className={`wsd ${phone ? "sheet" : "side"}`} role="dialog" aria-label="Study this word" onClick={(e) => e.stopPropagation()}>
        {phone && <div className="wsd-grab" />}
        <div className="wsd-top">
          <span className="wsd-pill">{word ? "Edit word" : "Study this word"}</span>
          <button type="button" className="wsd-x" aria-label="Close" onClick={onClose}>×</button>
        </div>
        <div className="wsd-term">{term || "Word"}</div>
        {from && <div className="wsd-from">From {from}</div>}
        {suggestion && anno && (
          <div className="wsd-sugg">
            Already in your word bank: <strong>{suggestion.term}</strong>{wordSubline(suggestion) ? ` (${wordSubline(suggestion)})` : ""}.
            <button type="button" disabled={busy} onClick={() => linkTo(suggestion)}>Link to it instead</button>
          </div>
        )}
        <label>Word<input value={term} onChange={(e) => setTerm(e.target.value)} /></label>
        <div className="wsd-row">
          <label>Original word<input value={original} placeholder="e.g. shāma" onChange={(e) => setOriginal(e.target.value)} /></label>
          <label>Strong's #<input value={strongs} placeholder="e.g. H8085" onChange={(e) => setStrongs(e.target.value)} /></label>
        </div>
        <div className="wsd-row">
          <label>Original script<input value={script} placeholder="e.g. שָׁמַע" dir="auto" onChange={(e) => setScript(e.target.value)} /></label>
          <label>Language
            <select value={language} onChange={(e) => setLanguage(e.target.value as WordLanguage | "")}>
              <option value="">—</option>
              {(Object.keys(LANG_LABEL) as WordLanguage[]).map((l) => <option key={l} value={l}>{LANG_LABEL[l]}</option>)}
            </select>
          </label>
        </div>
        <label>Part of speech<input value={pos} placeholder="e.g. verb" onChange={(e) => setPos(e.target.value)} /></label>
        <label>Meaning<textarea value={meaning} onChange={(e) => setMeaning(e.target.value)} /></label>
        {anno && <label>Reference (optional)<input value={reference} placeholder="e.g. v. 9 or Deut 6:4" onChange={(e) => setReference(e.target.value)} /></label>}
        <label>My notes
          <div className="wsd-notes">
            <WorkspaceEditor userId={userId} initialJSON={word?.notes ?? null} placeholder="What stands out about this word…"
              onChange={(json, text) => { notes.current = { json, text }; }} />
          </div>
        </label>
        <button type="button" className="wsd-save" disabled={busy || !term.trim()} onClick={save}>{word ? "Save changes" : "Save to word bank"}</button>
        {!word && <div className="wsd-help">It stays in the margin of this study too.</div>}
      </div>
    </>,
    document.body,
  );
}

/** The word card: used in the Read page word bank and from a margin card. */
export function WordCard({ userId, word, onOpenRef, onDeleted }: {
  userId: string; word: WordStudy;
  onOpenRef: (r: WordRef) => void;
  onDeleted?: () => void;
}) {
  const qc = useQueryClient();
  const meta = useDocMeta(userId);
  const refs = (useWordRefs(userId).data ?? []).filter((r) => r.word_study_id === word.id);
  const [editing, setEditing] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  const saveNotes = (json: any, text: string) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const { error } = await supabase.from("word_studies").update({ notes: json, notes_text: text }).eq("id", word.id);
      if (error) { console.error(error); toast.error("Couldn't save your notes."); return; }
      qc.setQueryData<WordStudy[]>(["word-studies", userId], (cur) => (cur ?? []).map((w) => (w.id === word.id ? { ...w, notes: json, notes_text: text } : w)));
    }, 700);
  };
  return (
    <div className="wc">
      <style>{WORD_CSS}</style>
      <div className="wsd-top">
        <span className="wsd-pill">Word study</span>
        <div className="wc-acts">
          <button type="button" className="wc-btn" onClick={() => setEditing(true)}>Edit</button>
          <button type="button" className="wc-btn del" onClick={() => setConfirm(true)}>Delete</button>
        </div>
      </div>
      <div className="wc-term">{word.term}</div>
      <div className="wc-meta">
        {word.original_script && <span className="scr" dir="auto">{word.original_script}</span>}
        {word.original && <span className="tr">{word.original}</span>}
        {word.strongs && <span>Strong's {word.strongs}</span>}
        {word.part_of_speech && <span>{word.part_of_speech}</span>}
        {word.language && <span>{LANG_LABEL[word.language]}</span>}
      </div>
      <div className="wc-sec">Meaning</div>
      <div className="wc-mean">{word.meaning || <span style={{ opacity: 0.5 }}>No meaning yet — tap Edit to add one.</span>}</div>
      <div className="wc-sec">My notes</div>
      <div className="wsd-notes">
        <WorkspaceEditor key={word.id} userId={userId} initialJSON={word.notes} placeholder="Write your notes on this word…" onChange={saveNotes} />
      </div>
      <div className="wc-sec">Where you've studied it · {refs.length}</div>
      {refs.length === 0 && <div style={{ fontSize: 13, opacity: 0.6 }}>Not linked to any study yet.</div>}
      {refs.map((r) => (
        <div key={r.id} className="wc-ref">
          <span className="dot" />
          <div style={{ minWidth: 0 }}>
            <div className="t">{meta.title(r.workspace_item_id)}</div>
            <div className="q">“{r.quote}”{r.reference ? ` · ${r.reference}` : ""}{meta.folder(r.workspace_item_id) ? ` · ${meta.folder(r.workspace_item_id)}` : ""}</div>
          </div>
          <button type="button" className="op" onClick={() => onOpenRef(r)}>Open →</button>
        </div>
      ))}
      {editing && <WordSheet userId={userId} word={word} onClose={() => setEditing(false)} />}
      <DeleteConfirmModal
        open={confirm}
        title={`Delete “${word.term}” from your word bank?`}
        message="The word card is removed. The highlighted words in your studies stay as word notes."
        onCancel={() => setConfirm(false)}
        onConfirm={async () => {
          setConfirm(false);
          try { await deleteWordStudy(word.id); invalidateWordBank(qc, userId); onDeleted?.(); }
          catch (e) { console.error(e); toast.error("Couldn't delete this word."); }
        }}
      />
    </div>
  );
}

/** Word card in a side panel / full-screen view (opened from a margin card). */
export function WordCardPanel({ userId, wordId, onClose, onOpenRef }: { userId: string; wordId: string; onClose: () => void; onOpenRef: (r: WordRef) => void }) {
  const phone = useIsPhone();
  const word = (useWordStudies(userId).data ?? []).find((w) => w.id === wordId);
  if (!word) return null;
  return createPortal(
    <>
      <style>{WORD_CSS}</style>
      <div className="wsd-bg" onClick={onClose} />
      <div className={`wsd ${phone ? "sheet" : "side"}`} role="dialog" aria-label={`Word study: ${word.term}`}>
        {phone && <div className="wsd-grab" />}
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 4 }}>
          <button type="button" className="wsd-x" aria-label="Close" onClick={onClose}>×</button>
        </div>
        <WordCard userId={userId} word={word} onOpenRef={(r) => { onClose(); onOpenRef(r); }} onDeleted={onClose} />
      </div>
    </>,
    document.body,
  );
}

export type { WordRef, WordStudy };
