import { useNavigate } from "@tanstack/react-router";
import type { CSSProperties } from "react";
import { toast } from "sonner";
import { Video, FileText, Mic, PenLine, BookOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { NEW_KINDS, useInvalidateStudio, type StudioKind } from "@/lib/studio-data";
import { C } from "./ui";

const ICONS: Record<string, any> = { teaching: Video, essay: FileText, podcast: Mic, blog: PenLine, devotional: BookOpen };

export async function createPiece(kind: StudioKind): Promise<string> {
  if (kind === "devotional") {
    const { data, error } = await supabase.from("devotional_templates").insert({ title: "Untitled devotional", status: "draft", duration_days: 1 }).select("id").single();
    if (error) throw error;
    await supabase.from("devotional_days").insert({ template_id: data.id, day_number: 1, title: "" });
    return data.id;
  }
  const { data, error } = await supabase.from("content_items").insert({ type: kind as any, title: "Untitled", status: "draft", body_doc: { type: "doc", content: [{ type: "paragraph" }] } as any }).select("id").single();
  if (error) throw error;
  return data.id;
}

export function NewPieceMenu({ onDone, style }: { onDone: () => void; style?: CSSProperties }) {
  const navigate = useNavigate();
  const invalidate = useInvalidateStudio();
  const go = async (k: StudioKind) => {
    try {
      const id = await createPiece(k);
      invalidate(); onDone();
      navigate({ to: "/studio/pieces/$id", params: { id } });
    } catch (e: any) { toast.error(e?.message ?? "Couldn't create that piece"); }
  };
  return (
    <div className="st-pop" style={{ width: 290, ...style }} role="menu">
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".12em", color: C.MUTED, padding: "4px 10px 8px" }}>NEW PIECE</div>
      {NEW_KINDS.map((k) => {
        const Icon = ICONS[k.kind];
        return (
          <button key={k.kind} type="button" role="menuitem" className="st-popitem" onClick={() => go(k.kind)}>
            <span className="tile"><Icon size={16} strokeWidth={1.7} /></span>
            <span><span className="tt">{k.label}</span><span className="dd">{k.desc}</span></span>
          </button>
        );
      })}
    </div>
  );
}
