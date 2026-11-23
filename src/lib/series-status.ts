import type { PieceStatus } from "@/lib/studio-checklist";

/** Series status from its parts: Live = some part released; Scheduled = some part scheduled; Draft = parts but none dated; Not started = no parts. */
export function seriesStatus(parts: (PieceStatus | "planned")[]): { status: PieceStatus | "notstarted"; released: number; total: number } {
  const released = parts.filter((p) => p === "live").length;
  const total = parts.length;
  if (!total) return { status: "notstarted", released, total };
  if (released) return { status: "live", released, total };
  if (parts.includes("scheduled")) return { status: "scheduled", released, total };
  return { status: "draft", released, total };
}
