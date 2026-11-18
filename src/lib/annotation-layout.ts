export type AnnotationCardPosition = { id: string; anchor: number; height: number };

/** Reserve the selected note's anchor before fitting the other cards around it. */
export function positionAnnotationCards(cards: AnnotationCardPosition[], activeId: string | null) {
  const positions = new Map<string, number>();
  const active = cards.find((card) => card.id === activeId);
  const activeTop = active ? Math.max(0, active.anchor) : 0;
  const activeBottom = active ? activeTop + active.height : 0;
  if (active) positions.set(active.id, activeTop);
  let bottom = 0;
  for (const card of cards) {
    if (card.id === active?.id) continue;
    let top = Math.max(0, card.anchor, bottom ? bottom + 10 : 0);
    if (active && top < activeBottom + 10 && top + card.height + 10 > activeTop) {
      top = activeBottom + 10;
    }
    positions.set(card.id, top);
    bottom = top + card.height;
  }
  return positions;
}