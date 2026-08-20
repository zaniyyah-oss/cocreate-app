import { z } from "zod";

export const PLAN_COLORS = [
  "navy", "limelight", "teal", "lime", "amber", "burgundy",
  "blush", "cream", "ink", "fire_red", "hot_pink", "periwinkle",
  "sage", "clay", "slate",
] as const;

export const planDayInput = z.object({
  day_number: z.number().int().positive(),
  read_content: z.string().nullable().optional(),
  pray_prompt: z.string().nullable().optional(),
  task_content: z.string().nullable().optional(),
});

export const createPlanInput = z.object({
  name: z.string().trim().min(1).max(160),
  color: z.enum(PLAN_COLORS),
  length_days: z.number().int().positive().max(365),
  source: z.enum(["built", "saved"]).default("built"),
  source_plan_id: z.string().uuid().nullable().optional(),
  days: z.array(planDayInput).default([]),
});

export const updatePlanDaysInput = z.object({
  plan_id: z.string().uuid(),
  days: z.array(planDayInput).min(1),
});

/** Full edit of an existing plan: meta + day content, with length changes allowed. */
export const updatePlanInput = z.object({
  plan_id: z.string().uuid(),
  name: z.string().trim().min(1).max(160),
  color: z.enum(PLAN_COLORS),
  length_days: z.number().int().positive().max(365),
  days: z.array(planDayInput).min(1),
});

export const startAssignmentInput = z.object({
  plan_id: z.string().uuid(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const completeDayInput = z.object({
  assignment_id: z.string().uuid(),
  day_number: z.number().int().positive(),
  completed: z.boolean().default(true),
});

export const saveDayResponseInput = z.object({
  assignment_id: z.string().uuid(),
  day_number: z.number().int().positive(),
  read_reflection: z.string().nullable().optional(),
  pray_reflection: z.string().nullable().optional(),
  task_done: z.boolean().optional(),
});

export const activePlanInput = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const planDayNoteInput = z.object({
  assignment_id: z.string().uuid(),
  day_number: z.number().int().positive(),
  title: z.string().trim().max(200).optional(),
});

export type PlanDayInput = z.infer<typeof planDayInput>;

export type PlanRow = {
  id: string;
  owner_id: string;
  name: string;
  color: string;
  length_days: number;
  source: "built" | "saved";
  source_plan_id: string | null;
  created_at: string;
  updated_at: string;
};

export type PlanDayRow = {
  id: string;
  plan_id: string;
  day_number: number;
  read_content: string | null;
  pray_prompt: string | null;
  task_content: string | null;
};

export type PlanAssignmentRow = {
  id: string;
  plan_id: string;
  user_id: string;
  start_date: string;
  current_day: number;
  status: "not_started" | "in_progress" | "completed";
  completed_at: string | null;
};

export type PlanDayResponseRow = {
  id: string;
  assignment_id: string;
  day_number: number;
  read_reflection: string | null;
  pray_reflection: string | null;
  task_done: boolean;
};

/** What the Workspace banner needs to render for a given calendar date. */
export type ActivePlanToday = {
  assignment: PlanAssignmentRow;
  plan: PlanRow;
  day: PlanDayRow | null;
  day_number: number;
  /** Banner CTA state: untouched -> start, partially worked -> return, done -> review. */
  day_state: "not_started" | "in_progress" | "completed";
  response: PlanDayResponseRow | null;
} | null;

/** Day N of an assignment falls on start_date + (N - 1). */
export function dayNumberForDate(startDate: string, date: string): number {
  const a = Date.parse(`${startDate}T00:00:00Z`);
  const b = Date.parse(`${date}T00:00:00Z`);
  return Math.floor((b - a) / 86_400_000) + 1;
}

/** Protected tag applied to notes generated from a plan day. */
export function planTag(planName: string): string {
  return planName.trim();
}

export function planNoteTitle(planName: string, dayNumber: number): string {
  return `${planName.trim()} • Day ${dayNumber}`;
}
