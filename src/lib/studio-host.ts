/** One place for the Studio subdomain config. */
export const MAIN_ORIGIN = "https://justcocreate.com";
export const STUDIO_ORIGIN = "https://studio.justcocreate.com";
/** Extra hostnames treated as the Studio host (for testing previews). */
export const EXTRA_STUDIO_HOSTS: string[] = [];

export function isStudioHost(hostname: string | null | undefined): boolean {
  if (!hostname) return false;
  const h = hostname.toLowerCase().split(":")[0]!;
  return h.startsWith("studio.") || EXTRA_STUDIO_HOSTS.includes(h);
}

const STAY = [/^\/studio(\/|$)/, /^\/auth(\/|$)/, /^\/preview\//, /^\/reset/, /^\/api\//, /^\/_/, /^\/assets\//];

/** Where a request on the studio host should go, or null to serve it here. */
export function studioHostRedirect(pathname: string, search: string): string | null {
  if (pathname === "/" || pathname === "") return "/studio";
  if (STAY.some((r) => r.test(pathname))) return null;
  if (/\.[a-z0-9]{2,5}$/i.test(pathname)) return null; // static files
  return `${MAIN_ORIGIN}${pathname}${search}`;
}

/** "mm:ss" / "h:mm:ss" / "90" -> seconds. */
export function parseTimestamp(s: string | null | undefined): number | null {
  if (!s) return null;
  const parts = String(s).trim().split(":").map((p) => Number(p));
  if (!parts.length || parts.some((n) => !Number.isFinite(n) || n < 0)) return null;
  return parts.reduce((a, n) => a * 60 + n, 0);
}
