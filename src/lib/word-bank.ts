import { useQuery, type QueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type WordLanguage = "hebrew" | "greek" | "aramaic" | "english";
export type WordStudy = {
  id: string; user_id: string; term: string; original: string; original_script: string | null;
  language: WordLanguage | null; strongs: string | null; part_of_speech: string | null;
  meaning: string; notes: any; notes_text: string; created_at: string; updated_at: string;
};
export type WordRef = {
  id: string; workspace_item_id: string; word_study_id: string | null; quote: string;
  reference: string | null; body: string; created_at: string;
};

export const wordBankKey = (userId: string) => ["word-studies", userId] as const;
export const wordRefsKey = (userId: string) => ["word-refs", userId] as const;

export function useWordStudies(userId: string | null | undefined) {
  return useQuery({
    queryKey: wordBankKey(userId ?? ""),
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from("word_studies").select("*").eq("user_id", userId!).order("term");
      if (error) throw error;
      return (data ?? []) as WordStudy[];
    },
  });
}

/** Every word-kind margin note the user has, linked or not. */
export function useWordRefs(userId: string | null | undefined) {
  return useQuery({
    queryKey: wordRefsKey(userId ?? ""),
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from("doc_annotations")
        .select("id,workspace_item_id,word_study_id,quote,reference,body,created_at")
        .eq("user_id", userId!).eq("kind", "word").order("created_at");
      if (error) throw error;
      return (data ?? []) as WordRef[];
    },
  });
}

export function invalidateWordBank(qc: QueryClient, userId: string) {
  qc.invalidateQueries({ queryKey: wordBankKey(userId) });
  qc.invalidateQueries({ queryKey: wordRefsKey(userId) });
  qc.invalidateQueries({ queryKey: ["doc-annotations"] });
}

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");

/** Very small English stemmer: enough for wise/wisdom, love/loved/loving, heart/hearts. */
export function stemWord(s: string): string {
  let w = norm(s);
  for (const suf of ["fulness", "ness", "dom", "ment", "ings", "ing", "edly", "ed", "ly", "es", "s", "e"]) {
    if (w.length - suf.length >= 3 && w.endsWith(suf)) { w = w.slice(0, -suf.length); break; }
  }
  return w;
}

/** Existing word studies that match a term (or Strong's number), best first. */
export function matchWordStudies(words: WordStudy[], term: string, strongs?: string | null): WordStudy[] {
  const t = norm(term), st = stemWord(term), sg = (strongs ?? "").trim().toUpperCase();
  if (!t && !sg) return [];
  const score = (w: WordStudy) => {
    if (sg && (w.strongs ?? "").trim().toUpperCase() === sg) return 3;
    if (t && norm(w.term) === t) return 3;
    if (t && w.original && norm(w.original) === t) return 2;
    if (st.length >= 3 && stemWord(w.term) === st) return 1;
    return 0;
  };
  return words.map((w) => [w, score(w)] as const).filter(([, s]) => s > 0).sort((a, b) => b[1] - a[1]).map(([w]) => w);
}

export const LANG_LABEL: Record<WordLanguage, string> = { hebrew: "Hebrew", greek: "Greek", aramaic: "Aramaic", english: "English" };

export function wordSubline(w: Pick<WordStudy, "original" | "strongs" | "language">, withLang = false) {
  return [w.original, w.strongs, withLang && w.language ? LANG_LABEL[w.language] : ""].filter(Boolean).join(" · ");
}

export async function linkAnnotation(annoId: string, wordId: string | null) {
  const { error } = await supabase.from("doc_annotations").update({ word_study_id: wordId }).eq("id", annoId);
  if (error) throw error;
}

/** Deleting a word keeps its margin notes as unlinked word notes. */
export async function deleteWordStudy(id: string) {
  const u = await supabase.from("doc_annotations").update({ word_study_id: null }).eq("word_study_id", id);
  if (u.error) throw u.error;
  const { error } = await supabase.from("word_studies").delete().eq("id", id);
  if (error) throw error;
}
