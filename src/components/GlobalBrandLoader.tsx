import { useSyncExternalStore } from "react";
import BrandLoadingScreen from "@/components/BrandLoadingScreen";
import { getBrandLoaderState, subscribeBrandLoader } from "@/lib/brand-loader-store";

const SERVER_STATE = { visible: false, leaving: false };

export default function GlobalBrandLoader() {
  const state = useSyncExternalStore(
    subscribeBrandLoader,
    getBrandLoaderState,
    () => SERVER_STATE,
  );
  if (!state.visible) return null;
  return <BrandLoadingScreen leaving={state.leaving} />;
}
