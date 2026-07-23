import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import type { Database } from "@/integrations/supabase/types";

export const Route = createFileRoute("/listen")({
  component: ListenPage,
  head: () => ({
    meta: [
      { title: "Listen — CoCreate" },
      { name: "description", content: "Listen to podcasts and audio teachings from CoCreate on your favorite platform." },
      { property: "og:title", content: "Listen — CoCreate" },
      { property: "og:description", content: "Listen to podcasts and audio teachings from CoCreate on your favorite platform." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

type ContentPreview = Database["public"]["Views"]["content_items_public"]["Row"];

const routeForType = (t: string | null | undefined) =>
  t === "teaching" ? "/teachings/$id" : t === "podcast" ? "/podcasts/$id" : "/essays/$id";

const CSS = `
.listen-root{font-family:'Poppins',sans-serif;background:#eee9d9;color:#20201c;min-height:100vh;}
.listen-root *{box-sizing:border-box;}
.listen-shell{max-width:1080px;margin:0 auto;padding:38px 28px 90px;}
.listen-h1{font-size:34px;font-weight:900;letter-spacing:-0.03em;color:#181A4D;margin:0 0 6px;}
.listen-sub{font-size:14px;color:#8a8678;font-weight:500;margin:0 0 28px;max-width:560px;line-height:1.55;}

.listen-cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:18px;}
.listen-card{background:#fff;border-radius:14px;overflow:hidden;cursor:pointer;transition:transform .18s, box-shadow .18s;border:1px solid rgba(20,20,20,0.06);display:flex;flex-direction:column;position:relative;text-decoration:none;color:inherit;}
.listen-card:hover{transform:translateY(-3px);box-shadow:0 14px 30px rgba(0,0,0,0.08);}
.listen-thumb{width:100%;aspect-ratio:16/9;background:#0F4A42;position:relative;overflow:hidden;}
.listen-thumb img{width:100%;height:100%;object-fit:cover;}
.listen-rt{position:absolute;top:10px;left:10px;font-size:9.5px;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;padding:4px 10px;border-radius:12px;background:#0F4A42;color:#FBF8ED;}
.listen-cbody{padding:14px 16px 16px;}
.listen-cbody h3{font-size:15px;font-weight:800;color:#181A4D;letter-spacing:-0.01em;margin:0 0 6px;line-height:1.35;}
.listen-cbody .a{font-size:11.5px;color:#8a8678;font-weight:600;}
.listen-empty{background:#fff;border:1.5px dashed rgba(20,20,20,0.12);border-radius:14px;padding:28px 24px;text-align:center;color:#8a8678;font-size:13.5px;line-height:1.6;}
.listen-empty strong{display:block;color:#181A4D;font-weight:800;font-size:15px;margin-bottom:6px;}
.listen-skel{background:#fff;border:1px solid rgba(20,20,20,0.06);border-radius:14px;height:240px;position:relative;overflow:hidden;}
.listen-skel::after{content:'';position:absolute;inset:0;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.7),transparent);animation:listen-shim 1.4s infinite;}
@keyframes listen-shim{0%{transform:translateX(-100%);}100%{transform:translateX(100%);}}
`;

function ListenPage() {
  const q = useQuery({
    queryKey: ["listen-content"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("content_items_public")
        .select("*")
        .eq("type", "podcast")
        .order("published_at", { ascending: false, nullsFirst: false });
      if (error) throw error;
      return (data ?? []) as ContentPreview[];
    },
  });

  const items = q.data ?? [];

  return (
    <AppShell current="home">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="listen-root">
        <div className="listen-shell">
          <h1 className="listen-h1">Listen</h1>
          <p className="listen-sub">Podcasts and audio teachings you can stream here or enjoy on your favorite podcast platform.</p>

          {q.isLoading ? (
            <div className="listen-cards">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="listen-skel" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="listen-empty">
              <strong>No episodes yet</strong>
              Check back soon for new podcasts and audio teachings.
            </div>
          ) : (
            <div className="listen-cards">
              {items.map((c) => (
                <Link
                  key={c.id}
                  to={routeForType(c.type) as any}
                  params={{ id: c.id! } as any}
                  className="listen-card"
                >
                  <div className="listen-thumb">
                    {c.thumbnail_url && <img src={c.thumbnail_url} alt={c.title ?? ""} />}
                    <span className="listen-rt">Podcast</span>
                  </div>
                  <div className="listen-cbody">
                    <h3>{c.title}</h3>
                    <div className="a">{c.author_name ?? "CoCreate"}</div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
