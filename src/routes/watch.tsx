import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import type { Database } from "@/integrations/supabase/types";

export const Route = createFileRoute("/watch")({
  component: WatchPage,
  head: () => ({
    meta: [
      { title: "Watch — CoCreate" },
      { name: "description", content: "Watch teachings, clips, and video content from CoCreate." },
      { property: "og:title", content: "Watch — CoCreate" },
      { property: "og:description", content: "Watch teachings, clips, and video content from CoCreate." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

type ContentPreview = Database["public"]["Views"]["content_items_public"]["Row"];
type ContentType = Database["public"]["Enums"]["content_type"];

const routeForType = (t: ContentType | null | undefined) =>
  t === "teaching" ? "/teachings/$id" : t === "podcast" ? "/podcasts/$id" : "/essays/$id";

const CSS = `
.watch-root{font-family:'Poppins',sans-serif;background:#eee9d9;color:#20201c;min-height:100vh;}
.watch-root *{box-sizing:border-box;}
.watch-shell{max-width:1080px;margin:0 auto;padding:38px 28px 90px;}
.watch-h1{font-size:34px;font-weight:900;letter-spacing:-0.03em;color:#181A4D;margin:0 0 6px;}
.watch-sub{font-size:14px;color:#8a8678;font-weight:500;margin:0 0 28px;max-width:560px;line-height:1.55;}

.watch-cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:18px;}
.watch-card{background:#fff;border-radius:14px;overflow:hidden;cursor:pointer;transition:transform .18s, box-shadow .18s;border:1px solid rgba(20,20,20,0.06);display:flex;flex-direction:column;position:relative;text-decoration:none;color:inherit;}
.watch-card:hover{transform:translateY(-3px);box-shadow:0 14px 30px rgba(0,0,0,0.08);}
.watch-thumb{width:100%;aspect-ratio:16/9;background:#181A4D;position:relative;overflow:hidden;}
.watch-thumb img{width:100%;height:100%;object-fit:cover;}
.watch-rt{position:absolute;top:10px;left:10px;font-size:9.5px;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;padding:4px 10px;border-radius:12px;background:#FF340C;color:#fff;}
.watch-cbody{padding:14px 16px 16px;}
.watch-cbody h3{font-size:15px;font-weight:800;color:#181A4D;letter-spacing:-0.01em;margin:0 0 6px;line-height:1.35;}
.watch-cbody .a{font-size:11.5px;color:#8a8678;font-weight:600;}
.watch-empty{background:#fff;border:1.5px dashed rgba(20,20,20,0.12);border-radius:14px;padding:28px 24px;text-align:center;color:#8a8678;font-size:13.5px;line-height:1.6;}
.watch-empty strong{display:block;color:#181A4D;font-weight:800;font-size:15px;margin-bottom:6px;}
.watch-skel{background:#fff;border:1px solid rgba(20,20,20,0.06);border-radius:14px;height:240px;position:relative;overflow:hidden;}
.watch-skel::after{content:'';position:absolute;inset:0;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.7),transparent);animation:watch-shim 1.4s infinite;}
@keyframes watch-shim{0%{transform:translateX(-100%);}100%{transform:translateX(100%);}}
`;

function WatchPage() {
  const q = useQuery({
    queryKey: ["watch-content"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("content_items_public")
        .select("*")
        .in("type", ["teaching", "clip"])
        .order("published_at", { ascending: false, nullsFirst: false });
      if (error) throw error;
      return (data ?? []) as ContentPreview[];
    },
  });

  const items = q.data ?? [];

  return (
    <AppShell current="home">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="watch-root">
        <div className="watch-shell">
          <h1 className="watch-h1">Watch</h1>
          <p className="watch-sub">Teachings, clips, and video content to help you build with him, not just for him.</p>

          {q.isLoading ? (
            <div className="watch-cards">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="watch-skel" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="watch-empty">
              <strong>No videos yet</strong>
              Check back soon for new teachings and clips.
            </div>
          ) : (
            <div className="watch-cards">
              {items.map((c) => (
                <Link
                  key={c.id}
                  to={routeForType(c.type) as any}
                  params={{ id: c.id! } as any}
                  className="watch-card"
                >
                  <div className="watch-thumb">
                    {c.thumbnail_url && <img src={c.thumbnail_url} alt={c.title ?? ""} />}
                    <span className="watch-rt">{(c.type ?? "teaching") === "clip" ? "Clip" : "Teaching"}</span>
                  </div>
                  <div className="watch-cbody">
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
