import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowUp, ArrowDown, X, Plus } from "lucide-react";
import { textToDoc, type DocNode } from "@/lib/piece-doc";
import { DocView } from "@/components/content/PieceRenderer";
import { BlockEditor } from "@/components/studio/BlockEditor";
import { ClipTiles } from "@/components/content/ClipPlayer";
import type { PublicClip } from "@/lib/clips";
import { kindLabel, monD, monthD, type SeriesInfo, type SeriesPart } from "@/lib/content-pages";
import { Ico, Ph, PlayBadge, PartLink, focalStyle } from "@/components/content/inner";

/**
 * The series page body, shared by the public /series/$slug page, share links and the
 * Studio series builder (which passes `edit` to make fields editable in place).
 */
export type SeriesViewSeries = SeriesInfo & { themes?: string[] | null; taught_by?: string[] | null; about_doc?: unknown };
export type SeriesDevo = { id: string; title: string; hero_url: string | null; duration_days: number | null };
export type SeriesEdit = {
  set: (patch: { eyebrow?: string; title?: string; summary?: string; writeup_title?: string }) => void;
  setAbout: (doc: DocNode) => void;
  setThemes: (t: string[]) => void;
  setTaughtBy: (t: string[]) => void;
  authorOptions: string[];
  onPhoto: () => void;
};

const MOBILE: [string, string][] = [
  [".wrap", "padding-left:16px;padding-right:16px;"],
  [".cs-hero", "min-height:0;aspect-ratio:4/5;"],
  [".cs-hero>img", "object-position:var(--fm,var(--fd,center));"],
  [".cs-hero .in", "padding:22px;"],
  [".cs-hero h1", "font-size:40px;"],
  [".cs-about", "flex-direction:column;gap:32px;margin-top:48px;"],
  [".cs-row", "flex-wrap:wrap;gap:12px;"],
  [".cs-row .th", "width:120px;"],
  [".cs-devo", "flex-direction:column;"],
  [".cs-devo .im", "width:100%;"],
  [".vc-tile", "width:150px;"],
];
export const SERIES_CSS = `
.cs-hero{position:relative;border-radius:6px;overflow:hidden;min-height:540px;display:flex;align-items:flex-end;margin-top:16px;background:var(--ph);}
.cs-hero>img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:var(--fd,center);}
.cs-hero .ov{position:absolute;inset:0;background:linear-gradient(90deg,rgba(10,14,36,.62),rgba(10,14,36,.12) 70%);}
.cs-hero .in{position:relative;padding:52px;max-width:640px;}
.cs-hero h1{margin:10px 0 0;font-family:Poppins,sans-serif;font-size:64px;font-weight:700;line-height:1.02;letter-spacing:-.03em;color:#fff;}
.cs-about{margin-top:72px;display:flex;gap:64px;}
.cs-row{display:flex;gap:22px;align-items:center;padding:18px 0;border-top:1px solid var(--line);}
.cs-row .th{width:200px;flex:none;}
.cs-devo{margin-top:72px;background:var(--soft);border-radius:12px;display:flex;overflow:hidden;}
.cs-devo .im{width:48%;flex:none;}
.sv-ed{outline:1.5px dashed transparent;outline-offset:3px;border-radius:4px;cursor:text;min-width:40px;display:inline-block;}
.sv-ed:empty::before{content:attr(data-ph);opacity:.55;}
.sv-ed.dk:hover,.sv-ed.dk:focus{outline-color:rgba(255,255,255,.85);}
.sv-ed.lt:hover{outline-color:#C9C6BE;}
.sv-ed.lt:focus{outline:1.5px solid #181A4D;outline-offset:3px;background:#EEF0FA;border-radius:6px;}
.sv-photo{position:absolute;top:16px;right:16px;z-index:2;height:32px;padding:0 14px;border-radius:999px;border:0;background:#fff;color:#181A4D;font-size:12.5px;font-weight:600;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.15);}
.sv-mini{border:0;background:none;padding:2px;color:var(--mut);cursor:pointer;display:inline-flex;}
.sv-add{border:1px dashed #C9C6BE;background:#fff;border-radius:999px;height:30px;padding:0 12px;font-size:12.5px;font-weight:600;color:var(--ink);cursor:pointer;display:inline-flex;align-items:center;gap:6px;}
@media(max-width:760px){${MOBILE.map(([a, b]) => `${a}{${b}}`).join("")}}
${MOBILE.map(([a, b]) => `.sv-phone ${a}{${b}}`).join("")}
`;

/** Plain-text inline editor (contentEditable) that only pushes changes up; parent autosaves. */
export function EditText({ value, onChange, placeholder, dark, as: Tag = "span", className, style, multiline }: { value: string; onChange: (v: string) => void; placeholder: string; dark?: boolean; as?: any; className?: string; style?: any; multiline?: boolean }) {
  const ref = useRef<HTMLElement | null>(null);
  useEffect(() => { const el = ref.current; if (el && document.activeElement !== el && el.textContent !== value) el.textContent = value; }, [value]);
  return (
    <Tag ref={ref} contentEditable suppressContentEditableWarning role="textbox" aria-label={placeholder} data-ph={placeholder}
      className={`sv-ed ${dark ? "dk" : "lt"}${className ? ` ${className}` : ""}`} style={style}
      onInput={(e: any) => onChange(e.currentTarget.textContent ?? "")}
      onKeyDown={(e: any) => { if (e.key === "Enter" && !multiline) { e.preventDefault(); e.currentTarget.blur(); } }}
      onPaste={(e: any) => { e.preventDefault(); document.execCommand("insertText", false, e.clipboardData.getData("text/plain")); }} />
  );
}

export function seriesMonths(parts: SeriesPart[]) {
  const ds = parts.map((p) => p.releaseAt).filter(Boolean).sort() as string[];
  if (!ds.length) return "";
  const f = (x: string) => new Date(x).toLocaleDateString(undefined, { month: "long" });
  return f(ds[0]!) === f(ds[ds.length - 1]!) ? f(ds[0]!) : `${f(ds[0]!)}–${f(ds[ds.length - 1]!)}`;
}

export function SeriesView({ s, parts, clips, devo, topicNames, authors, edit, links = true, phone, heroActions, listTop, rowAction, devoDays }: {
  s: SeriesViewSeries; parts: SeriesPart[]; clips: PublicClip[]; devo: SeriesDevo | null; topicNames: string[]; authors: string[];
  edit?: SeriesEdit; links?: boolean; phone?: boolean;
  heroActions?: ReactNode; listTop?: ReactNode; rowAction?: (p: SeriesPart, i: number) => ReactNode; devoDays?: (n: number) => ReactNode;
}) {
  const months = seriesMonths(parts);
  const finalDate = [...parts].map((p) => p.releaseAt).filter(Boolean).sort().pop() ?? null;
  const released = parts.filter((p) => p.released).length;
  const heroImg = s.banner_url || s.cover_image_url;
  const themes = s.themes?.length ? s.themes : edit ? [] : topicNames;
  const taught = s.taught_by?.length ? s.taught_by : edit ? [] : authors;
  const about = (s.about_doc as DocNode | null) ?? (s.writeup_body ? textToDoc(s.writeup_body) : null);
  const Wrap = ({ p, children, className, style }: { p: SeriesPart; children: ReactNode; className?: string; style?: any }) => links ? <PartLink part={p} className={className} style={style}>{children}</PartLink> : <div className={className} style={style}>{children}</div>;
  const [newTheme, setNewTheme] = useState("");
  const [newAuthor, setNewAuthor] = useState("");
  const moveIn = (list: string[], i: number, d: -1 | 1) => { const l = [...list]; const j = i + d; if (j < 0 || j >= l.length) return l; [l[i], l[j]] = [l[j]!, l[i]!]; return l; };

  return (
    <div className={phone ? "sv-phone" : undefined}>
      <style dangerouslySetInnerHTML={{ __html: SERIES_CSS }} />
      <section className="cs-hero" style={focalStyle(s.hero_focal_desktop, s.hero_focal_mobile)}>
        {heroImg && <img src={heroImg} alt="" />}
        <div className="ov" />
        {edit && <button type="button" className="sv-photo" onClick={edit.onPhoto}>Change photo · Adjust crop</button>}
        <div className="in">
          <div className="k" style={{ color: "#fff" }}>Series · {edit ? <EditText dark value={s.eyebrow ?? ""} placeholder={months || "[Months]"} onChange={(v) => edit.set({ eyebrow: v })} /> : (s.eyebrow || months)}</div>
          {edit ? <h1><EditText dark value={s.title} placeholder="[Series name]" onChange={(v) => edit.set({ title: v })} /></h1> : <h1>{s.title}</h1>}
          {edit ? <p style={{ fontSize: 18, color: "#fff", margin: "14px 0 0", lineHeight: 1.45 }}><EditText dark value={s.summary ?? ""} placeholder="[One-line description]" onChange={(v) => edit.set({ summary: v })} /></p>
            : s.summary && <p style={{ fontSize: 18, color: "#fff", margin: "14px 0 0", lineHeight: 1.45 }}>{s.summary}</p>}
          {heroActions && <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 24 }}>{heroActions}</div>}
        </div>
      </section>

      <section className="cs-about">
        <div style={{ flex: 2, minWidth: 0 }}>
          <div className="k">About this series</div>
          {edit ? <p className="ttl" style={{ fontSize: 26, fontWeight: 500, lineHeight: 1.35, margin: "14px 0 0" }}><EditText multiline value={s.writeup_title ?? ""} placeholder="[About intro]" onChange={(v) => edit.set({ writeup_title: v })} style={{ display: "block" }} /></p>
            : (s.description || s.writeup_title) && <p className="ttl" style={{ fontSize: 26, fontWeight: 500, lineHeight: 1.35, margin: "14px 0 0" }}>{s.writeup_title || s.description}</p>}
          {edit ? <div style={{ marginTop: 20 }}><BlockEditor value={about ?? { type: "doc", content: [{ type: "paragraph" }] }} onChange={edit.setAbout} placeholder="[About body] — type / for blocks" minHeight={80} /></div>
            : about && <div className="pc-body" style={{ marginTop: 20 }}><DocView node={about} /></div>}
        </div>
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 28 }}>
          <div style={{ display: "flex", gap: 28 }}>
            <Stat n={String(parts.length)} l="pieces" />
            <Stat n={String(released)} l="out now" />
            {finalDate && <Stat n={monD(finalDate)} l="final release" />}
          </div>
          {(themes.length > 0 || edit) && (
            <div><div className="k" style={{ marginBottom: 10 }}>What you’ll explore</div>
              <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
                {themes.slice(0, edit ? 99 : 5).map((t, i) => (
                  <li key={edit ? i : t} style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 15, color: "var(--ink)" }}>{Ico.check(15)}
                    {edit ? <>
                      <EditText value={t} placeholder="[Theme]" onChange={(v) => edit.setThemes(themes.map((x, j) => (j === i ? v : x)))} style={{ flex: 1 }} />
                      <button type="button" className="sv-mini" aria-label="Move theme up" onClick={() => edit.setThemes(moveIn(themes, i, -1))}><ArrowUp size={13} /></button>
                      <button type="button" className="sv-mini" aria-label="Move theme down" onClick={() => edit.setThemes(moveIn(themes, i, 1))}><ArrowDown size={13} /></button>
                      <button type="button" className="sv-mini" aria-label="Remove theme" onClick={() => edit.setThemes(themes.filter((_, j) => j !== i))}><X size={13} /></button>
                    </> : t}
                  </li>
                ))}
              </ul>
              {edit && <form style={{ display: "flex", gap: 6, marginTop: 10 }} onSubmit={(e) => { e.preventDefault(); if (newTheme.trim()) { edit.setThemes([...themes, newTheme.trim()]); setNewTheme(""); } }}>
                <input value={newTheme} onChange={(e) => setNewTheme(e.target.value)} placeholder="Add a theme" style={{ flex: 1, height: 30, border: "1px solid var(--line)", borderRadius: 8, padding: "0 10px", fontSize: 13 }} />
                <button type="submit" className="sv-add"><Plus size={13} />Add</button>
              </form>}
              {edit && !themes.length && topicNames.length > 0 && <div style={{ fontSize: 12, color: "var(--mut)", marginTop: 6 }}>Until you add themes, readers see the series topics: {topicNames.slice(0, 5).join(", ")}</div>}
            </div>
          )}
          {(taught.length > 0 || edit) && (
            <div><div className="k" style={{ marginBottom: 10 }}>Taught by</div>
              {taught.slice(0, edit ? 99 : 3).map((a, i) => (
                <div key={a + i} style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 8 }}>
                  <span style={{ width: 44, height: 44, borderRadius: 999, background: "#E8E6F5", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Poppins", fontWeight: 600, color: "var(--ink)" }}>{a.charAt(0).toUpperCase()}</span>
                  <span style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)", flex: 1 }}>{a}</span>
                  {edit && <button type="button" className="sv-mini" aria-label={`Remove ${a}`} onClick={() => edit.setTaughtBy(taught.filter((_, j) => j !== i))}><X size={14} /></button>}
                </div>
              ))}
              {edit && <form style={{ display: "flex", gap: 6 }} onSubmit={(e) => { e.preventDefault(); const v = newAuthor.trim(); if (v && !taught.includes(v)) { edit.setTaughtBy([...taught, v]); } setNewAuthor(""); }}>
                <input list="sv-authors" value={newAuthor} onChange={(e) => setNewAuthor(e.target.value)} placeholder="Add a person" style={{ flex: 1, height: 30, border: "1px solid var(--line)", borderRadius: 8, padding: "0 10px", fontSize: 13 }} />
                <datalist id="sv-authors">{edit.authorOptions.filter((o) => !taught.includes(o)).map((o) => <option key={o} value={o} />)}</datalist>
                <button type="submit" className="sv-add"><Plus size={13} />Add</button>
              </form>}
            </div>
          )}
        </div>
      </section>

      {(clips.length > 0 || edit) && (
        <section style={{ marginTop: 80 }}>
          <div className="sh" style={{ marginBottom: 4 }}><h2>Inside the series</h2></div>
          <p style={{ fontSize: 14, color: "var(--mut)", margin: "0 0 18px" }}>Short clips from the series</p>
          {clips.length ? <ClipTiles clips={clips} /> : <div style={{ fontSize: 13, color: "var(--mut)", border: "1px dashed #C9C6BE", borderRadius: 10, padding: 20 }}>No clips yet — add them under Clips on the left. This row is hidden on the site until there is one.</div>}
        </section>
      )}

      <section style={{ marginTop: 80 }}>
        <div className="sh"><h2>The series, in order</h2></div>
        {listTop}
        {parts.length === 0 && <div style={{ fontSize: 14, color: "var(--mut)" }}>No pieces yet.</div>}
        {parts.map((p, i) => {
          const media = p.kind === "teaching" || p.kind === "podcast" || p.kind === "clip";
          return (
            <div key={p.key} className="cs-row" data-piece-id={p.piece?.id}>
              <span className="ttl" style={{ fontSize: 26, fontWeight: 700, color: p.released ? "var(--ink)" : "#B5B2A8", width: 40 }}>{i + 1}</span>
              <div className="th"><Ph src={p.thumb} ratio="16/10" gray={!p.released}>{media && p.released ? <PlayBadge /> : null}</Ph></div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="k">{p.released ? [kindLabel(p.kind), p.length, monD(p.releaseAt)].filter(Boolean).join(" · ") : `${kindLabel(p.kind)} · Coming ${monD(p.releaseAt)}`}</div>
                <Wrap p={p}><div className="ttl" style={{ fontSize: 19, fontWeight: 600, marginTop: 4, color: p.released ? "var(--ink)" : "var(--mut)" }}>{p.title || `Coming ${monthD(p.releaseAt)}`}</div></Wrap>
                {p.summary && <div style={{ fontSize: 14, color: "var(--mut)", marginTop: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.summary}</div>}
              </div>
              {rowAction?.(p, i)}
            </div>
          );
        })}
      </section>

      {devo && (
        <section className="cs-devo">
          <div className="im"><Ph src={devo.hero_url} ratio="16/10" radius={0} /></div>
          <div style={{ padding: 40, display: "flex", flexDirection: "column", gap: 12, justifyContent: "center" }}>
            <div className="k">The series devotional</div>
            <div className="ttl" style={{ fontSize: 30, fontWeight: 700, lineHeight: 1.15 }}>{devo.title}</div>
            {devo.duration_days ? <div style={{ fontSize: 15, color: "var(--mut)" }}>{devo.duration_days} days · Read alongside the teaching</div> : null}
            {devoDays && devo.duration_days ? devoDays(devo.duration_days) : null}
          </div>
        </section>
      )}
    </div>
  );
}

function Stat({ n, l }: { n: string; l: string }) {
  return <div><div className="ttl" style={{ fontSize: 22, fontWeight: 700 }}>{n}</div><div style={{ fontSize: 13, color: "var(--mut)" }}>{l}</div></div>;
}
