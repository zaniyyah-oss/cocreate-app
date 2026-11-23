/**
 * Related-content ordering shared by every content page (pure; the server function feeds it rows).
 * Order: (1) same series in series order, including scheduled parts; (2) same topic, newest first,
 * skipping pieces the reader finished; (3) "Just released" fills the rest. Nothing repeats.
 */
export type RelPiece = {
  id: string; type: string | null; title: string | null; release_at: string | null;
  hero_url: string | null; cover_image_url: string | null; thumbnail_url: string | null;
  hero_focal_desktop: string | null; hero_focal_mobile: string | null;
  duration_seconds: number | null; read_time_minutes: number | null; summary: string | null; excerpt: string | null; slug: string | null;
};
export type RelItem = { piece: RelPiece; reason: string; released: boolean };
export type RelatedInput = {
  now: Date;
  seriesOrder: string[];
  topicName: string | null;
  topicPieceIds: Set<string>;
  pieces: RelPiece[];
  exclude: string[];
  finished: string[];
  topicLimit: number;
  latestLimit: number;
};
export type RelatedResult = { series: RelItem[]; topic: RelItem[]; latest: RelItem[] };

const rel = (p: RelPiece, now: Date) => !!p.release_at && new Date(p.release_at).getTime() <= now.getTime();

export function orderRelated(i: RelatedInput): RelatedResult {
  const used = new Set(i.exclude);
  const byId = new Map(i.pieces.map((p) => [p.id, p]));
  const series: RelItem[] = [];
  let sawNext = false;
  for (const id of i.seriesOrder) {
    const p = byId.get(id);
    if (!p || used.has(id)) continue;
    used.add(id);
    const released = rel(p, i.now);
    series.push({ piece: p, released, reason: released ? "Same series" : (sawNext ? "Coming soon" : "Coming next") });
    if (!released) sawNext = true;
  }
  const finished = new Set(i.finished);
  const newest = [...i.pieces].filter((p) => rel(p, i.now)).sort((a, b) => (b.release_at ?? "").localeCompare(a.release_at ?? ""));
  const topic: RelItem[] = [];
  if (i.topicName) {
    for (const p of newest) {
      if (topic.length >= i.topicLimit) break;
      if (used.has(p.id) || finished.has(p.id) || !i.topicPieceIds.has(p.id)) continue;
      used.add(p.id);
      topic.push({ piece: p, released: true, reason: `Shares the topic ${i.topicName}` });
    }
  }
  const latest: RelItem[] = [];
  for (const p of newest) {
    if (latest.length >= i.latestLimit) break;
    if (used.has(p.id)) continue;
    used.add(p.id);
    latest.push({ piece: p, released: true, reason: "Just released" });
  }
  return { series, topic, latest };
}
