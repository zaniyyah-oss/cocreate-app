import type { CSSProperties, ReactNode } from "react";
import type { DocNode } from "@/lib/piece-doc";

/**
 * ONE shared renderer for a piece: used by the Studio editor preview, share links and
 * (Phase 3) the public article pages. The Studio editor canvas uses the same PIECE_CSS
 * classes so writing looks exactly like reading.
 */
export const PIECE_CSS = `
.pc-article{font-family:var(--cs-font-sans,'Instrument Sans',sans-serif);color:#2A2B33;}
.pc-kicker{font-size:12px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#5F5D55;}
.pc-title{margin:12px 0 0;font-family:'Poppins',sans-serif;font-size:40px;font-weight:700;line-height:1.1;letter-spacing:-.025em;color:#181A4D;}
.pc-summary{margin:12px 0 0;font-size:18px;line-height:1.5;color:#5F5D55;}
.pc-hero{margin:26px 0 0;border-radius:10px;overflow:hidden;aspect-ratio:16/7;background:#E9E6DF;position:relative;}
.pc-hero img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;}
.pc-hero-cap{margin-top:8px;font-size:12.5px;color:#5F5D55;}
.pc-body{font-size:17px;line-height:1.7;color:#2A2B33;margin-top:26px;}
.pc-body:focus{outline:none;}
.pc-body p{margin:0 0 16px;}
.pc-body h2{margin:36px 0 14px;font-family:'Poppins',sans-serif;font-size:24px;font-weight:600;letter-spacing:-.01em;color:#181A4D;line-height:1.25;}
.pc-body h3{margin:28px 0 10px;font-family:'Poppins',sans-serif;font-size:19px;font-weight:600;color:#181A4D;line-height:1.3;}
.pc-body ul,.pc-body ol{margin:18px 0 16px;padding-left:22px;}
.pc-body li p{margin:0;}
.pc-body a{color:#181A4D;text-decoration:underline;text-underline-offset:3px;}
.pc-body strong{font-weight:700;color:#181A4D;}
.pc-body em{font-style:normal;}
.pc-scripture{margin:28px 0;padding:20px 24px;border-left:3px solid #181A4D;background:#F6F5F1;border-radius:0 10px 10px 0;}
.pc-ref{display:block;font-size:11.5px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#5F5D55;margin-bottom:8px;}
.pc-passage{font-size:16px;line-height:1.6;color:#2A2B33;}
.pc-pull{margin:32px 0;padding:0;border:0;font-family:'Poppins',sans-serif;font-size:26px;font-weight:600;line-height:1.3;letter-spacing:-.015em;color:#181A4D;}
.pc-figure{margin:28px 0;}
.pc-figure.inline{max-width:60%;}
.pc-figure img{display:block;width:100%;border-radius:10px;}
.pc-figure figcaption{margin-top:8px;font-size:13px;color:#5F5D55;}
.pc-deeper{margin:28px 0;display:flex;align-items:center;gap:14px;padding:16px 18px;border:1px solid #E6E3DC;border-radius:12px;background:#fff;text-decoration:none!important;}
.pc-deeper .k{font-size:11.5px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#5F5D55;}
.pc-deeper .t{font-family:'Poppins',sans-serif;font-size:16px;font-weight:600;color:#181A4D;}
.pc-deeper .s{font-size:12.5px;color:#5F5D55;}
.pc-clip{margin:28px auto;width:220px;aspect-ratio:9/16;border-radius:12px;background:#F6F5F1;border:1px dashed #C9C6BE;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;color:#5F5D55;font-size:13px;}
.pc-day{margin-top:40px;padding-top:28px;border-top:1px solid #E6E3DC;}
.pc-day:first-of-type{border-top:0;padding-top:0;}
.pc-qs{margin:16px 0 0;padding-left:22px;font-size:17px;line-height:1.7;}
.pc-label{display:block;margin:24px 0 8px;font-size:11.5px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#5F5D55;}
@media(max-width:640px){.pc-title{font-size:30px;}.pc-hero{aspect-ratio:4/5;}.pc-figure.inline{max-width:100%;}}
`;

export type GoDeeperLookup = (id: string) => { title: string; kind: string; href?: string } | null;

function renderMarks(text: ReactNode, marks: DocNode["marks"]) {
  let out = text;
  for (const m of marks ?? []) {
    if (m.type === "bold") out = <strong>{out}</strong>;
    else if (m.type === "link") out = <a href={m.attrs?.href} target="_blank" rel="noopener noreferrer">{out}</a>;
    else if (m.type === "underline") out = <u>{out}</u>;
  }
  return out;
}

const fmtTs = (s: string) => s.trim();

export function DocView({ node, lookup }: { node: DocNode; lookup?: GoDeeperLookup }): ReactNode {
  const kids = (node.content ?? []).map((c, i) => <DocView key={i} node={c} lookup={lookup} />);
  switch (node.type) {
    case "doc": return <>{kids}</>;
    case "paragraph": return <p>{kids}</p>;
    case "heading": return node.attrs?.level === 3 ? <h3>{kids}</h3> : <h2>{kids}</h2>;
    case "text": return <>{renderMarks(node.text, node.marks)}</>;
    case "hardBreak": return <br />;
    case "bulletList": return <ul>{kids}</ul>;
    case "orderedList": return <ol>{kids}</ol>;
    case "listItem": return <li>{kids}</li>;
    case "blockquote":
    case "pullQuote": return <blockquote className="pc-pull">{kids}</blockquote>;
    case "horizontalRule": return <hr />;
    case "scripture":
      return <figure className="pc-scripture">{node.attrs?.reference ? <span className="pc-ref">{node.attrs.reference}</span> : null}<div className="pc-passage">{kids}</div></figure>;
    case "figure":
      if (!node.attrs?.src) return null;
      return <figure className={`pc-figure${node.attrs?.layout === "inline" ? " inline" : ""}`}><img src={node.attrs.src} alt={node.attrs?.caption ?? ""} loading="lazy" />{node.attrs?.caption ? <figcaption>{node.attrs.caption}</figcaption> : null}</figure>;
    case "goDeeper": {
      const id = node.attrs?.pieceId as string | undefined;
      const hit = id && lookup ? lookup(id) : null;
      const title = hit?.title ?? node.attrs?.title;
      if (!title) return null;
      const inner = (<><span style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1 }}><span className="k">Go deeper · {hit?.kind ?? node.attrs?.kind ?? ""}</span><span className="t">{title}</span>{node.attrs?.timestamp ? <span className="s">From {fmtTs(node.attrs.timestamp)}</span> : null}</span><span aria-hidden>→</span></>);
      return hit?.href ? <a className="pc-deeper" href={hit.href}>{inner}</a> : <div className="pc-deeper">{inner}</div>;
    }
    case "clip": return <div className="pc-clip"><span>Clip</span>{node.attrs?.caption ? <span>{node.attrs.caption}</span> : null}</div>;
    default: return <>{kids}</>;
  }
}

export type PieceView = {
  kicker: string;
  title: string;
  summary?: string | null;
  heroUrl?: string | null;
  heroCaption?: string | null;
  focalDesktop?: string | null;
  focalMobile?: string | null;
  doc?: DocNode | null;
};

export function PieceRenderer({ piece, lookup, children }: { piece: PieceView; lookup?: GoDeeperLookup; children?: ReactNode }) {
  const style = { ["--fd" as any]: piece.focalDesktop || "center", ["--fm" as any]: piece.focalMobile || piece.focalDesktop || "center" } as CSSProperties;
  return (
    <article className="pc-article">
      <style dangerouslySetInnerHTML={{ __html: PIECE_CSS + ".pc-hero img{object-position:var(--fd)}@media(max-width:640px){.pc-hero img{object-position:var(--fm)}}" }} />
      {piece.kicker && <span className="pc-kicker">{piece.kicker}</span>}
      <h1 className="pc-title">{piece.title}</h1>
      {piece.summary ? <p className="pc-summary">{piece.summary}</p> : null}
      {piece.heroUrl ? <><div className="pc-hero" style={style}><img src={piece.heroUrl} alt="" /></div>{piece.heroCaption ? <div className="pc-hero-cap">{piece.heroCaption}</div> : null}</> : null}
      {piece.doc ? <div className="pc-body"><DocView node={piece.doc} lookup={lookup} /></div> : null}
      {children}
    </article>
  );
}

export type DevoDayView = { day_number: number; title: string; scripture_reference?: string | null; scripture_passage?: string | null; reflection_doc?: DocNode | null; questions?: string[] | null; pray_prompt?: string | null };

export function DevotionalDaysView({ days }: { days: DevoDayView[] }) {
  return (
    <div className="pc-body">
      {days.map((d) => (
        <section key={d.day_number} className="pc-day">
          <span className="pc-kicker">Day {d.day_number}</span>
          {d.title ? <h2 style={{ marginTop: 8 }}>{d.title}</h2> : null}
          {(d.scripture_reference || d.scripture_passage) && (
            <figure className="pc-scripture">{d.scripture_reference ? <span className="pc-ref">{d.scripture_reference}</span> : null}<div className="pc-passage">{d.scripture_passage}</div></figure>
          )}
          {d.reflection_doc ? <DocView node={d.reflection_doc} /> : null}
          {d.questions && d.questions.filter(Boolean).length > 0 && (<><span className="pc-label">Questions</span><ol className="pc-qs">{d.questions.filter(Boolean).map((q, i) => <li key={i}>{q}</li>)}</ol></>)}
          {d.pray_prompt ? <><span className="pc-label">Prayer prompt</span><p>{d.pray_prompt}</p></> : null}
        </section>
      ))}
    </div>
  );
}
