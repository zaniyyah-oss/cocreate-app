import { supabase } from "@/integrations/supabase/client";

export type StudyLinkStatus = "new" | "continued" | "revisited";
export const UNTITLED_STUDY = "Untitled study";

/** Log that a study was touched on a date. Never overwrites an existing row. */
export async function logStudyOpen(userId: string, date: string, itemId: string, status: "new" | "revisited") {
  await supabase
    .from("entry_study_links" as any)
    .upsert(
      { user_id: userId, entry_date: date, workspace_item_id: itemId, status },
      { onConflict: "user_id,entry_date,workspace_item_id", ignoreDuplicates: true },
    );
}

/** First content edit on a date: upgrade to 'continued' (never downgrade 'new'). */
export async function markStudyContinued(userId: string, date: string, itemId: string) {
  const { data } = await supabase
    .from("entry_study_links" as any)
    .select("id,status")
    .eq("user_id", userId)
    .eq("entry_date", date)
    .eq("workspace_item_id", itemId)
    .maybeSingle();
  const row = data as { id: string; status: StudyLinkStatus } | null;
  if (row?.status === "new" || row?.status === "continued") return false;
  if (row) {
    await supabase.from("entry_study_links" as any).update({ status: "continued" }).eq("id", row.id);
  } else {
    await supabase
      .from("entry_study_links" as any)
      .insert({ user_id: userId, entry_date: date, workspace_item_id: itemId, status: "continued" });
  }
  return true;
}

/** Create a new open study and log it as 'new' for the date. */
export async function createStudy(userId: string, date: string, entryId: string | null) {
  const { data, error } = await supabase
    .from("workspace_items" as any)
    .insert({
      user_id: userId,
      devotional_entry_id: entryId,
      kind: "study",
      title: UNTITLED_STUDY,
      body: {},
      body_text: "",
      tags: [],
      status: "open",
    })
    .select("id")
    .single();
  if (error) throw error;
  const id = (data as any).id as string;
  await logStudyOpen(userId, date, id, "new");
  return id;
}

/** A study with no real title and no content should not be kept. */
export function isEmptyStudy(title: string | null | undefined, bodyText: string | null | undefined) {
  const t = (title ?? "").trim();
  return (t === "" || t === UNTITLED_STUDY) && !(bodyText ?? "").trim();
}

export function shortDate(iso: string) {
  const d = iso.length === 10 ? new Date(`${iso}T12:00:00`) : new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
