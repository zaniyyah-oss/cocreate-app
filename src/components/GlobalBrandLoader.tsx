import { useEffect, useSyncExternalStore } from "react";
import BrandLoadingScreen from "@/components/BrandLoadingScreen";
import { removeBootLoader } from "@/components/BootBrandLoader";
import { getBrandLoaderState, subscribeBrandLoader } from "@/lib/brand-loader-store";

const SERVER_STATE = { visible: false, leaving: false };

export default function GlobalBrandLoader() {
  const state = useSyncExternalStore(
    subscribeBrandLoader,
    getBrandLoaderState,
    () => SERVER_STATE,
  );

  // Hand off from the pre-hydration boot overlay to the React loader (or drop
  // the boot overlay entirely if the gate decided not to run).
  useEffect(() => {
    if (state.visible) {
      const id = requestAnimationFrame(() => requestAnimationFrame(removeBootLoader));
      return () => cancelAnimationFrame(id);
    }
    removeBootLoader();
  }, [state.visible]);

  if (!state.visible) return null;
  return <BrandLoadingScreen leaving={state.leaving} />;
}
