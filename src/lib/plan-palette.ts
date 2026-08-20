// Colors selectable when building a devotional plan.
// Deliberately excludes amber, blush(pink) and periwinkle — those are reserved
// for the Read/Pray/To-do tile legend in the Workspace.

export type PlanColor = {
  key: string;
  label: string;
  hex: string;
  /** Light tint used for box backgrounds. */
  tint: string;
  /** Readable text color on top of `hex`. */
  onHex: string;
};

export const PLAN_PALETTE: PlanColor[] = [
  { key: "navy",  label: "Navy",       hex: "#181A4D", tint: "#E7E8F0", onHex: "#FBF8ED" },
  { key: "lime",  label: "Olive",      hex: "#CAC307", tint: "#F7F6DE", onHex: "#181A4D" },
  { key: "burgundy", label: "Brown",   hex: "#441B07", tint: "#EFE6E0", onHex: "#FBF8ED" },
  { key: "sage",  label: "Dusty sage", hex: "#7C8A6B", tint: "#EEF1E8", onHex: "#FBF8ED" },
  { key: "clay",  label: "Clay",       hex: "#A8552F", tint: "#F6E8E1", onHex: "#FBF8ED" },
  { key: "slate", label: "Slate blue", hex: "#4A5D7E", tint: "#E9EDF3", onHex: "#FBF8ED" },
];

export const PLAN_LENGTHS = [1, 3, 5, 10] as const;

export function planColor(key: string | null | undefined): PlanColor {
  return PLAN_PALETTE.find((c) => c.key === key) ?? PLAN_PALETTE[0];
}
