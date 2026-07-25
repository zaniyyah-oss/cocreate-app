/**
 * Tiny global store for the branded landing loader so the overlay can survive
 * the client-side navigation from Home -> Workspace (a component-local overlay
 * unmounts the moment the route changes, which is what caused the flash of a
 * half-loaded workspace).
 */
type State = { visible: boolean; leaving: boolean };

let state: State = { visible: false, leaving: false };
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

export function subscribeBrandLoader(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function getBrandLoaderState() {
  return state;
}

export function showBrandLoader() {
  if (state.visible && !state.leaving) return;
  state = { visible: true, leaving: false };
  emit();
}

export function fadeOutBrandLoader(fadeMs: number) {
  if (!state.visible || state.leaving) return;
  state = { visible: true, leaving: true };
  emit();
  setTimeout(() => {
    state = { visible: false, leaving: false };
    emit();
  }, fadeMs);
}
