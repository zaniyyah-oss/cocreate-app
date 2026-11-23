import { createStart, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";
import { isStudioHost, studioHostRedirect } from "./lib/studio-host";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

const studioHostMiddleware = createMiddleware().server(async ({ next, request }) => {
  const url = new URL(request.url);
  const host = request.headers.get("x-forwarded-host") ?? url.host;
  if (!isStudioHost(host)) return next();
  if (request.method === "GET" && !request.headers.get("x-tsr-serverFn") && !url.pathname.startsWith("/_serverFn")) {
    const to = studioHostRedirect(url.pathname, url.search);
    if (to) return new Response(null, { status: 302, headers: { location: to } }) as any;
  }
  const res: any = await next();
  try { res?.response?.headers?.set?.("X-Robots-Tag", "noindex"); } catch { /* ignore */ }
  return res;
});

export const startInstance = createStart(() => ({
  functionMiddleware: [attachSupabaseAuth],
  requestMiddleware: [studioHostMiddleware, errorMiddleware],
}));
