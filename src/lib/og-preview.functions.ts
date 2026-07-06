import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

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
  .inputValidator((d) => inputSchema.parse(d))
  .handler(async ({ data }): Promise<OgPreview> => {
    const url = data.url;
    const domain = new URL(url).hostname.replace(/^www\./, "");

    const fallback: OgPreview = {
      url, title: null, description: null, image: null, siteName: null, domain,
    };

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          "user-agent": "Mozilla/5.0 (compatible; CoCreateBot/1.0; +https://cocreate.app)",
          accept: "text/html,application/xhtml+xml",
        },
        redirect: "follow",
      });
      clearTimeout(timeout);
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
