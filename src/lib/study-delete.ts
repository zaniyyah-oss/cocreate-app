import { supabase } from "@/integrations/supabase/client";

// Fields that belong to the Read / study column of a devotional entry.
const READ_FIELDS = {
  scripture_reference: null,
  scripture_text: null,
  further_reading_text: null,
  book_of_bible: null,
  book_source: null,
  book_confirmed: false,
  books_of_bible: [] as string[],
  topic_ids: [] as string[],
};

const hasText = (v: unknown) =>
  typeof v === "string" && v.replace(/<[^>]*>/g, "").trim().length > 0;

/**
 * Deleting a study must never wipe the rest of the day. We clear only the Read
 * fields; the underlying row (which also holds Where/Pray/To-Do and the
 * workspace title) is removed only when nothing else on the day remains.
 */
export async function deleteStudyOnly(entryId: string): Promise<"cleared" | "removed"> {
  const { data: row, error: readErr } = await supabase
    .from("devotional_entries")
    .select("*")
    .eq("id", entryId)
    .maybeSingle();
  if (readErr) throw readErr;
  if (!row) return "removed";

  const e = row as Record<string, unknown>;
  const dayHasContent =
    hasText(e.entry_title) ||
    hasText(e.entry_subtitle) ||
    hasText(e.where_text) ||
    hasText(e.pray_text) ||
    hasText(e.reflect_text) ||
    hasText(e.apply_text) ||
    hasText(e.todo_text) ||
    (Array.isArray(e.todo_items) && (e.todo_items as unknown[]).length > 0);

  if (dayHasContent) {
    const { error } = await supabase
      .from("devotional_entries")
      .update(READ_FIELDS as never)
      .eq("id", entryId);
    if (error) throw error;
    return "cleared";
  }

  await supabase
    .from("workspace_items")
    .update({ devotional_entry_id: null } as never)
    .eq("devotional_entry_id", entryId);
  const { error } = await supabase.from("devotional_entries").delete().eq("id", entryId);
  if (error) throw error;
  return "removed";
}
