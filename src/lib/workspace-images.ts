import { supabase } from "@/integrations/supabase/client";

export const WORKSPACE_IMAGE_BUCKET = "workspace-images";
const SIGNED_TTL = 60 * 60 * 24 * 365; // 1 year

/** Upload an image for the current user and return its storage path + signed URL. */
export async function uploadWorkspaceImage(file: File): Promise<{ path: string; url: string }> {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) throw new Error("Sign in to add photos.");

  const ext = (file.name.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "");
  const path = `${uid}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { error } = await supabase.storage
    .from(WORKSPACE_IMAGE_BUCKET)
    .upload(path, file, { contentType: file.type || "image/png", upsert: false });
  if (error) throw error;

  const url = await signWorkspaceImage(path);
  return { path, url: url ?? "" };
}

export async function signWorkspaceImage(path: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(WORKSPACE_IMAGE_BUCKET)
    .createSignedUrl(path, SIGNED_TTL);
  if (error) return null;
  return data?.signedUrl ?? null;
}

/**
 * Re-sign every <img data-ws-path="..."> inside an element so previously
 * stored (possibly expired) URLs keep rendering.
 */
export async function refreshWorkspaceImages(el: HTMLElement): Promise<void> {
  const imgs = Array.from(el.querySelectorAll<HTMLImageElement>("img[data-ws-path]"));
  if (imgs.length === 0) return;
  const paths = Array.from(new Set(imgs.map((i) => i.dataset.wsPath!).filter(Boolean)));
  const { data } = await supabase.storage
    .from(WORKSPACE_IMAGE_BUCKET)
    .createSignedUrls(paths, SIGNED_TTL);
  if (!data) return;
  const map = new Map<string, string>();
  for (const row of data) {
    if (row.path && row.signedUrl) map.set(row.path, row.signedUrl);
  }
  for (const img of imgs) {
    const next = map.get(img.dataset.wsPath ?? "");
    if (next && img.getAttribute("src") !== next) img.setAttribute("src", next);
  }
}
