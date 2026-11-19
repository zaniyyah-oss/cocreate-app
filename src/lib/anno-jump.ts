/** Cross-component request to scroll an open document to a margin-note mark. */
const pending = new Map<string, string>();
const EVT = "cc-anno-jump";
export function requestAnnoJump(itemId: string, annoId: string) {
  pending.set(itemId, annoId);
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(EVT, { detail: itemId }));
}
export function takeAnnoJump(itemId: string): string | undefined {
  const a = pending.get(itemId); pending.delete(itemId); return a;
}
export function onAnnoJump(fn: (itemId: string) => void) {
  const h = (e: Event) => fn((e as CustomEvent<string>).detail);
  window.addEventListener(EVT, h);
  return () => window.removeEventListener(EVT, h);
}
