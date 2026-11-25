import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Refuse local, private and non-web destinations so the server can't be pointed at internal hosts. */
function isSafeTarget(raw: string): boolean {
  let u: URL;
  try { u = new URL(raw); } catch { return false; }
  if (u.protocol !== "https:" && u.protocol !== "http:") return false;
  if (u.port && u.port !== "80" && u.port !== "443") return false;
  const h = u.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (!h.includes(".") || h === "localhost" || h.endsWith(".localhost") || h.endsWith(".local") || h.endsWith(".internal")) return false;
  if (h.includes(":")) return false; // raw IPv6
  const m = h.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (m) {
    const [a, b] = [Number(m[1]), Number(m[2])];
    if (a === 10 || a === 127 || a === 0 || a >= 224 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127)) return false;
  }
  return true;
}

const inputSchema = z.object({ url: z.string().url() });

export type OgPreview = {
  url: string;
  title: string | null;
  description: string | null;
  image: string | null;
  siteName: string | null;
  domain: string;
};

function extractMeta(html: string, name: string): string | null {
  // Handles og:name, twitter:name, and name= attributes; case-insensitive.
  const patterns = [
    new RegExp(`<meta[^>]+property=["']og:${name}["'][^>]+content=["']([^"']+)["']`, "i"),
    new RegExp(`<meta[^>]+name=["']twitter:${name}["'][^>]+content=["']([^"']+)["']`, "i"),
    new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']+)["']`, "i"),
    // content-first order fallback
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:${name}["']`, "i"),
  ];
  for (const p of patterns) {
    const m = html.match(p);
    if (m) return decodeEntities(m[1]);
  }
  return null;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'");
}

export const fetchOgPreview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => inputSchema.parse(d))
  .handler(async ({ data }): Promise<OgPreview> => {
    const url = data.url;
    const domain = new URL(url).hostname.replace(/^www\./, "");

    const fallback: OgPreview = {
      url, title: null, description: null, image: null, siteName: null, domain,
    };

    if (!isSafeTarget(url)) return fallback;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);
      let res = await fetch(url, {
        signal: controller.signal,
        headers: {
          "user-agent": "Mozilla/5.0 (compatible; CoCreateBot/1.0; +https://cocreate.app)",
          accept: "text/html,application/xhtml+xml",
        },
        redirect: "manual",
      });
      clearTimeout(timeout);
      if (res.status >= 300 && res.status < 400) {
        const loc = res.headers.get("location");
        const next = loc ? new URL(loc, url).toString() : null;
        if (!next || !isSafeTarget(next)) return fallback;
        res = await fetch(next, { signal: controller.signal, headers: { accept: "text/html,application/xhtml+xml" }, redirect: "manual" });
      }
      if (!res.ok) return fallback;
      const ct = res.headers.get("content-type") ?? "";
      if (!ct.includes("text/html")) return fallback;

      // Only read the first ~200KB to keep this cheap
      const reader = res.body?.getReader();
      if (!reader) return fallback;
      const chunks: Uint8Array[] = [];
      let total = 0;
      const MAX = 200_000;
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          chunks.push(value);
          total += value.length;
          if (total >= MAX) break;
        }
      }
      try { await reader.cancel(); } catch { /* ignore */ }
      const html = new TextDecoder("utf-8", { fatal: false })
        .decode(Buffer.concat(chunks.map((c) => Buffer.from(c))));

      let title = extractMeta(html, "title");
      if (!title) {
        const m = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        if (m) title = decodeEntities(m[1]).trim();
      }
      const description = extractMeta(html, "description");
      let image = extractMeta(html, "image");
      if (image && image.startsWith("/")) {
        image = new URL(image, url).toString();
      }
      const siteName = extractMeta(html, "site_name");

      return { url, title, description, image, siteName, domain };
    } catch {
      return fallback;
    }
  });
