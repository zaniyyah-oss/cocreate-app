import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  createPlanInput,
  updatePlanDaysInput,
  startAssignmentInput,
  completeDayInput,
  saveDayResponseInput,
  activePlanInput,
  planDayNoteInput,
  dayNumberForDate,
  planTag,
  planNoteTitle,
  type ActivePlanToday,
  type PlanRow,
  type PlanDayRow,
  type PlanAssignmentRow,
  type PlanDayResponseRow,
} from "./plans.schemas";

/** List the current user's plans (built or saved), newest first. */
export const listPlans = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<PlanRow[]> => {
    const db = context.supabase as any;
    const { data, error } = await db
      .from("plans")
      .select("*")
      .eq("owner_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as PlanRow[];
  });

/** Fetch one plan with all of its days, ordered. */
export const getPlan = createServerFn({ method: "GET" })
  .inputValidator((d) => ({ id: String((d as any).id) }))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }): Promise<{ plan: PlanRow; days: PlanDayRow[] } | null> => {
    const db = context.supabase as any;
    const { data: plan, error } = await db
      .from("plans").select("*").eq("id", data.id).maybeSingle();
    if (error) throw error;
    if (!plan) return null;
    const { data: days, error: dErr } = await db
      .from("plan_days").select("*").eq("plan_id", data.id)
      .order("day_number", { ascending: true });
    if (dErr) throw dErr;
    return { plan: plan as PlanRow, days: (days ?? []) as PlanDayRow[] };
  });

/** Create a plan and (optionally) its days in one call. */
export const createPlan = createServerFn({ method: "POST" })
  .inputValidator((d) => createPlanInput.parse(d))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }): Promise<{ plan: PlanRow; days: PlanDayRow[] }> => {
    const db = context.supabase as any;
    const { data: plan, error } = await db
      .from("plans")
      .insert({
        owner_id: context.userId,
        name: data.name,
        color: data.color,
        length_days: data.length_days,
        source: data.source,
        source_plan_id: data.source_plan_id ?? null,
      })
      .select("*")
      .single();
    if (error) throw error;

    let days: PlanDayRow[] = [];
    if (data.days.length) {
      const rows = data.days.map((d) => ({
        plan_id: plan.id,
        day_number: d.day_number,
        read_content: d.read_content ?? null,
        pray_prompt: d.pray_prompt ?? null,
        task_content: d.task_content ?? null,
      }));
      const { data: inserted, error: dErr } = await db
        .from("plan_days").insert(rows).select("*").order("day_number", { ascending: true });
      if (dErr) throw dErr;
      days = (inserted ?? []) as PlanDayRow[];
    }
    return { plan: plan as PlanRow, days };
  });

/** Upsert the day content of a plan (used by the builder's save). */
export const savePlanDays = createServerFn({ method: "POST" })
  .inputValidator((d) => updatePlanDaysInput.parse(d))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }): Promise<PlanDayRow[]> => {
    const db = context.supabase as any;
    const rows = data.days.map((d) => ({
      plan_id: data.plan_id,
      day_number: d.day_number,
      read_content: d.read_content ?? null,
      pray_prompt: d.pray_prompt ?? null,
      task_content: d.task_content ?? null,
    }));
    const { data: saved, error } = await db
      .from("plan_days")
      .upsert(rows, { onConflict: "plan_id,day_number" })
      .select("*")
      .order("day_number", { ascending: true });
    if (error) throw error;
    return (saved ?? []) as PlanDayRow[];
  });

/**
 * Edit an existing plan the user owns: rename, recolor, change length and copy.
 * Shrinking the length drops the trailing days (and any responses/completions
 * for them) and clamps in-flight assignments so live rendering stays valid.
 */
export const updatePlan = createServerFn({ method: "POST" })
  .inputValidator((d) => updatePlanInput.parse(d))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }): Promise<{ plan: PlanRow; days: PlanDayRow[] }> => {
    const db = context.supabase as any;

    const { data: plan, error } = await db
      .from("plans")
      .update({ name: data.name, color: data.color, length_days: data.length_days })
      .eq("id", data.plan_id)
      .eq("owner_id", context.userId)
      .select("*")
      .single();
    if (error) throw error;

    const rows = data.days
      .filter((d) => d.day_number <= data.length_days)
      .map((d) => ({
        plan_id: data.plan_id,
        day_number: d.day_number,
        read_content: d.read_content ?? null,
        pray_prompt: d.pray_prompt ?? null,
        task_content: d.task_content ?? null,
      }));

    const { error: upErr } = await db
      .from("plan_days")
      .upsert(rows, { onConflict: "plan_id,day_number" });
    if (upErr) throw upErr;

    // Drop days beyond the new length.
    const { error: delErr } = await db
      .from("plan_days")
      .delete()
      .eq("plan_id", data.plan_id)
      .gt("day_number", data.length_days);
    if (delErr) throw delErr;

    // Keep live assignments consistent with the new length.
    const { data: assignments } = await db
      .from("plan_assignments")
      .select("id,current_day")
      .eq("plan_id", data.plan_id)
      .eq("user_id", context.userId);

    for (const a of (assignments ?? []) as Array<{ id: string; current_day: number }>) {
      await db.from("plan_day_responses").delete()
        .eq("assignment_id", a.id).gt("day_number", data.length_days);
      await db.from("plan_day_completions").delete()
        .eq("assignment_id", a.id).gt("day_number", data.length_days);
      if (a.current_day > data.length_days) {
        await db.from("plan_assignments")
          .update({ current_day: data.length_days })
          .eq("id", a.id);
      }
    }

    const { data: days, error: dErr } = await db
      .from("plan_days").select("*").eq("plan_id", data.plan_id)
      .order("day_number", { ascending: true });
    if (dErr) throw dErr;

    return { plan: plan as PlanRow, days: (days ?? []) as PlanDayRow[] };
  });

export const deletePlan = createServerFn({ method: "POST" })
  .inputValidator((d) => ({ id: String((d as any).id) }))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const db = context.supabase as any;
    const { error } = await db.from("plans").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

/** Put a plan into use starting on a given calendar date ("Start today" / "Assign days"). */
export const startPlanAssignment = createServerFn({ method: "POST" })
  .inputValidator((d) => startAssignmentInput.parse(d))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }): Promise<PlanAssignmentRow> => {
    const db = context.supabase as any;
    const { data: row, error } = await db
      .from("plan_assignments")
      .insert({
        plan_id: data.plan_id,
        user_id: context.userId,
        start_date: data.start_date,
        current_day: 1,
        status: "not_started",
      })
      .select("*")
      .single();
    if (error) throw error;
    return row as PlanAssignmentRow;
  });

/** List the user's assignments (optionally for one plan). */
export const listPlanAssignments = createServerFn({ method: "GET" })
  .inputValidator((d) => ({ plan_id: (d as any)?.plan_id ? String((d as any).plan_id) : null }))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }): Promise<PlanAssignmentRow[]> => {
    const db = context.supabase as any;
    let q = db.from("plan_assignments").select("*")
      .eq("user_id", context.userId)
      .order("start_date", { ascending: false });
    if (data.plan_id) q = q.eq("plan_id", data.plan_id);
    const { data: rows, error } = await q;
    if (error) throw error;
    return (rows ?? []) as PlanAssignmentRow[];
  });

/** Save the user's own reflections / task checkbox for a day. Marks the assignment in progress. */
export const savePlanDayResponse = createServerFn({ method: "POST" })
  .inputValidator((d) => saveDayResponseInput.parse(d))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }): Promise<PlanDayResponseRow> => {
    const db = context.supabase as any;
    const patch: Record<string, unknown> = {
      assignment_id: data.assignment_id,
      day_number: data.day_number,
    };
    if (data.read_reflection !== undefined) patch.read_reflection = data.read_reflection;
    if (data.pray_reflection !== undefined) patch.pray_reflection = data.pray_reflection;
    if (data.task_done !== undefined) patch.task_done = data.task_done;

    const { data: row, error } = await db
      .from("plan_day_responses")
      .upsert(patch, { onConflict: "assignment_id,day_number" })
      .select("*")
      .single();
    if (error) throw error;

    await db.from("plan_assignments")
      .update({ status: "in_progress" })
      .eq("id", data.assignment_id)
      .eq("status", "not_started");

    return row as PlanDayResponseRow;
  });

/**
 * Mark a single day complete (or undo it), advance current_day, and flip the
 * assignment to completed once every day has a completion row.
 */
export const setPlanDayComplete = createServerFn({ method: "POST" })
  .inputValidator((d) => completeDayInput.parse(d))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }): Promise<PlanAssignmentRow> => {
    const db = context.supabase as any;

    if (data.completed) {
      const { error } = await db.from("plan_day_completions")
        .upsert(
          { assignment_id: data.assignment_id, day_number: data.day_number },
          { onConflict: "assignment_id,day_number" },
        );
      if (error) throw error;
    } else {
      const { error } = await db.from("plan_day_completions")
        .delete()
        .eq("assignment_id", data.assignment_id)
        .eq("day_number", data.day_number);
      if (error) throw error;
    }

    const { data: assignment, error: aErr } = await db
      .from("plan_assignments").select("*").eq("id", data.assignment_id).single();
    if (aErr) throw aErr;

    const { data: plan, error: pErr } = await db
      .from("plans").select("length_days").eq("id", assignment.plan_id).single();
    if (pErr) throw pErr;

    const { count, error: cErr } = await db
      .from("plan_day_completions")
      .select("id", { count: "exact", head: true })
      .eq("assignment_id", data.assignment_id);
    if (cErr) throw cErr;

    const done = count ?? 0;
    const total = plan.length_days as number;
    const allDone = done >= total;

    const { data: updated, error: uErr } = await db
      .from("plan_assignments")
      .update({
        current_day: Math.min(total, Math.max(assignment.current_day, data.completed ? data.day_number + 1 : data.day_number)),
        status: allDone ? "completed" : "in_progress",
        completed_at: allDone ? new Date().toISOString() : null,
      })
      .eq("id", data.assignment_id)
      .select("*")
      .single();
    if (uErr) throw uErr;
    return updated as PlanAssignmentRow;
  });

/**
 * What the Workspace banner shows for a given date: the active assignment whose
 * window contains that date, the day's pre-written content, and its state.
 */
export const getActivePlanForDate = createServerFn({ method: "GET" })
  .inputValidator((d) => activePlanInput.parse(d))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }): Promise<ActivePlanToday> => {
    const db = context.supabase as any;

    const { data: assignments, error } = await db
      .from("plan_assignments")
      .select("*, plans!inner(*)")
      .eq("user_id", context.userId)
      .lte("start_date", data.date)
      .order("start_date", { ascending: false });
    if (error) throw error;

    for (const a of (assignments ?? []) as any[]) {
      const plan = a.plans as PlanRow;
      const dayNumber = dayNumberForDate(a.start_date, data.date);
      if (dayNumber < 1 || dayNumber > plan.length_days) continue;

      const [{ data: day }, { data: response }, { data: completion }] = await Promise.all([
        db.from("plan_days").select("*")
          .eq("plan_id", plan.id).eq("day_number", dayNumber).maybeSingle(),
        db.from("plan_day_responses").select("*")
          .eq("assignment_id", a.id).eq("day_number", dayNumber).maybeSingle(),
        db.from("plan_day_completions").select("id")
          .eq("assignment_id", a.id).eq("day_number", dayNumber).maybeSingle(),
      ]);

      const touched = !!response && (
        !!response.read_reflection || !!response.pray_reflection || response.task_done
      );

      const assignment: PlanAssignmentRow = {
        id: a.id, plan_id: a.plan_id, user_id: a.user_id, start_date: a.start_date,
        current_day: a.current_day, status: a.status, completed_at: a.completed_at,
      };

      return {
        assignment,
        plan,
        day: (day ?? null) as PlanDayRow | null,
        day_number: dayNumber,
        day_state: completion ? "completed" : touched ? "in_progress" : "not_started",
        response: (response ?? null) as PlanDayResponseRow | null,
      };
    }

    return null;
  });

/**
 * "+ Add a note for this day" — creates a real workspace note, titled
 * "<Plan> • Day N" and tagged with the protected plan tag.
 */
export const createPlanDayNote = createServerFn({ method: "POST" })
  .inputValidator((d) => planDayNoteInput.parse(d))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const db = context.supabase as any;

    const { data: assignment, error: aErr } = await db
      .from("plan_assignments").select("id, plan_id").eq("id", data.assignment_id).single();
    if (aErr) throw aErr;

    const { data: plan, error: pErr } = await db
      .from("plans").select("name").eq("id", assignment.plan_id).single();
    if (pErr) throw pErr;

    const { data: note, error } = await db
      .from("workspace_items")
      .insert({
        user_id: context.userId,
        title: data.title?.trim() || planNoteTitle(plan.name, data.day_number),
        body: { type: "doc", content: [{ type: "paragraph" }] },
        body_text: "",
        tags: [planTag(plan.name)],
        status: "open",
        plan_assignment_id: data.assignment_id,
        plan_day_number: data.day_number,
      })
      .select("*")
      .single();
    if (error) throw error;
    return note;
  });

/** Notes already created for a given plan day. */
export const listPlanDayNotes = createServerFn({ method: "GET" })
  .inputValidator((d) => ({
    assignment_id: String((d as any).assignment_id),
    day_number: Number((d as any).day_number),
  }))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const db = context.supabase as any;
    const { data: rows, error } = await db
      .from("workspace_items")
      .select("id, title, body_text, tags, updated_at")
      .eq("user_id", context.userId)
      .eq("plan_assignment_id", data.assignment_id)
      .eq("plan_day_number", data.day_number)
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return rows ?? [];
  });
