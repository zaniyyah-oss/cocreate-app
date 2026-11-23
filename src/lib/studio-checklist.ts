/** Readiness checklist for a Studio piece ("Ready to schedule · N of 6"). */
export type ChecklistInput = {
  title: string | null | undefined;
  summary: string | null | undefined;
  hasBody: boolean;
  inSeries: boolean;
  part: number | null | undefined;
  standalone: boolean;
  heroUrl: string | null | undefined;
  focalDesktop: string | null | undefined;
  focalMobile: string | null | undefined;
  topicCount: number;
  releaseAt: string | null | undefined;
};
export type CheckKey = "title" | "body" | "series" | "hero" | "topics" | "release";
export type CheckItem = { key: CheckKey; label: string; missing: string; done: boolean };

export function checklist(i: ChecklistInput): CheckItem[] {
  const t = (s: string | null | undefined) => !!s && s.trim().length > 0;
  return [
    { key: "title", label: "Title and summary", missing: "title or summary", done: t(i.title) && t(i.summary) },
    { key: "body", label: "Body", missing: "body", done: i.hasBody },
    { key: "series", label: "Series & part (or standalone)", missing: "series", done: i.standalone || (i.inSeries && !!i.part && i.part > 0) },
    { key: "hero", label: "Hero photo cropped for desktop and mobile", missing: "hero photo", done: t(i.heroUrl) && t(i.focalDesktop) && t(i.focalMobile) },
    { key: "topics", label: "1–3 topics", missing: "topic tags", done: i.topicCount >= 1 && i.topicCount <= 3 },
    { key: "release", label: "Release date & time", missing: "release time", done: t(i.releaseAt) },
  ];
}

export const readyCount = (items: CheckItem[]) => items.filter((c) => c.done).length;
export const isReady = (items: CheckItem[]) => items.every((c) => c.done);

/** "Missing hero photo and topic tags" */
export function missingText(items: CheckItem[]): string {
  const m = items.filter((c) => !c.done).map((c) => c.missing);
  if (!m.length) return "";
  const list = m.length === 1 ? m[0] : `${m.slice(0, -1).join(", ")} and ${m[m.length - 1]}`;
  return `Missing ${list}`;
}

export type PieceStatus = "draft" | "scheduled" | "live";
/** Draft = not published; Scheduled = published with a future release; Live = released. */
export function pieceStatus(status: string | null | undefined, releaseAt: string | null | undefined, now: Date = new Date()): PieceStatus {
  if (status !== "published") return "draft";
  if (releaseAt && new Date(releaseAt).getTime() > now.getTime()) return "scheduled";
  return "live";
}
