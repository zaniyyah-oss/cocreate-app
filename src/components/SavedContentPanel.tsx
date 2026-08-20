import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { brandColor } from "@/lib/brand-palette";

type SavedRow = {
  id: string;
  saved_at: string;
  content_item_id: string | null;
  content_items: {
    id: string;
    title: string;
    type: string;
    author_name: string | null;
    topic_id: string | null;
    external_url: string | null;
  } | null;
};

type TopicLite = { id: string; name: string; display_name: string | null; color_key: string };

const mediumFor = (type: string | null | undefined): "read" | "listen" | "watch" =>
  type === "podcast" ? "listen" : type === "teaching" || type === "clip" ? "watch" : "read";

const routeFor = (type: string | null | undefined) =>
  type === "teaching" ? "/teachings/$id" : type === "podcast" ? "/podcasts/$id" : "/essays/$id";

const MediumIcon = ({ medium }: { medium: "read" | "listen" | "watch" }) => {
  const common = {
    width: 16,
    height: 16,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  if (medium === "listen")
    return (
      <svg {...common}>
        <path d="M3 14v-2a9 9 0 0 1 18 0v2" />
        <path d="M21 15a2 2 0 0 1-2 2h-1v-5h1a2 2 0 0 1 2 2Z" />
        <path d="M3 15a2 2 0 0 0 2 2h1v-5H5a2 2 0 0 0-2 2Z" />
      </svg>
    );
  if (medium === "watch")
    return (
      <svg {...common}>
        <rect x="2" y="4" width="20" height="16" rx="3" />
        <path d="M10 9l5 3-5 3V9Z" />
      </svg>
    );
  return (
    <svg {...common}>
      <path d="M4 5h7v15H4z" />
      <path d="M13 5h7v15h-7z" />
    </svg>
  );
};

const fmt = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

export function SavedContentPanel() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [sort, setSort] = useState<"latest" | "topic">("latest");
  const [topicIds, setTopicIds] = useState<string[]>([]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data?.user?.id ?? null);
      setReady(true);
    });
  }, []);

  const saved = useQuery({
    queryKey: ["read-saved-content", userId],
    enabled: ready && !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("saved_items")
        .select(
          "id, saved_at, content_item_id, content_items(id, title, type, author_name, topic_id, external_url)"
        )
        .eq("user_id", userId!)
        .not("content_item_id", "is", null)
        .order("saved_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as SavedRow[];
    },
  });

  const rows = useMemo(() => (saved.data ?? []).filter((r) => r.content_items), [saved.data]);

  const usedTopicIds = useMemo(
    () => Array.from(new Set(rows.map((r) => r.content_items?.topic_id).filter(Boolean) as string[])),
    [rows]
  );

  const topics = useQuery({
    queryKey: ["read-saved-topics", usedTopicIds.join(",")],
    enabled: usedTopicIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("topics")
        .select("id,name,display_name,color_key")
        .in("id", usedTopicIds);
      if (error) throw error;
      return (data ?? []) as TopicLite[];
    },
  });

  const topicMap = useMemo(() => {
    const m = new Map<string, TopicLite>();
    for (const t of topics.data ?? []) m.set(t.id, t);
    return m;
  }, [topics.data]);

  const visible = useMemo(() => {
    let list = rows;
    if (topicIds.length) list = list.filter((r) => topicIds.includes(r.content_items?.topic_id ?? ""));
    const sorted = [...list];
    if (sort === "topic") {
      sorted.sort((a, b) => {
        const ta = topicMap.get(a.content_items?.topic_id ?? "");
        const tb = topicMap.get(b.content_items?.topic_id ?? "");
        const na = (ta?.display_name ?? ta?.name ?? "zzz").toLowerCase();
        const nb = (tb?.display_name ?? tb?.name ?? "zzz").toLowerCase();
        if (na !== nb) return na.localeCompare(nb);
        return b.saved_at.localeCompare(a.saved_at);
      });
    } else {
      sorted.sort((a, b) => b.saved_at.localeCompare(a.saved_at));
    }
    return sorted;
  }, [rows, topicIds, sort, topicMap]);

  const open = (r: SavedRow) => {
    const c = r.content_items!;
    navigate({ to: routeFor(c.type), params: { id: c.id } as any });
  };

  if (ready && !userId) {
    return <div className="sc-empty">Sign in to see everything you've saved.</div>;
  }

  return (
    <div className="sc-wrap">
      <style>{`
        .sc-wrap{margin-top:8px}
        .sc-bar{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:14px}
        .sc-sort{display:inline-flex;border:1px solid #e2ddcd;border-radius:999px;overflow:hidden;background:#fff}
        .sc-sort button{appearance:none;border:0;background:transparent;padding:7px 14px;font-size:12px;letter-spacing:.04em;text-transform:uppercase;color:#8a8879;cursor:pointer}
        .sc-sort button.on{background:#181A4D;color:#fff}
        .sc-pills{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:18px}
        .sc-pill{appearance:none;border-radius:999px;padding:6px 12px;font-size:11px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;cursor:pointer;border:1px solid}
        .sc-list{display:flex;flex-direction:column;gap:10px}
        .sc-row{display:flex;align-items:center;gap:14px;background:#FBF8ED;border:1px solid #E7E0D0;border-radius:14px;padding:14px 16px}
        .sc-ico{width:34px;height:34px;border-radius:10px;display:grid;place-items:center;background:#fff;border:1px solid #E7E0D0;color:#181A4D;flex:0 0 auto}
        .sc-main{min-width:0;flex:1}
        .sc-title{font-size:15px;font-weight:600;color:#181A4D;line-height:1.3;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .sc-meta{margin-top:3px;font-size:12px;color:#8a8879;display:flex;gap:8px;align-items:center;flex-wrap:wrap}
        .sc-tag{font-size:10px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;border-radius:999px;padding:3px 8px}
        .sc-act{appearance:none;border:0;border-radius:999px;padding:8px 16px;font-size:12px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;background:#181A4D;color:#fff;cursor:pointer;flex:0 0 auto}
        .sc-empty{background:#FBF8ED;border:1px solid #E7E0D0;border-radius:16px;padding:40px 24px;text-align:center;color:#8a8879;font-size:14px}
        @media (max-width:640px){.sc-row{flex-wrap:wrap}.sc-act{width:100%;text-align:center}}
      `}</style>

      <div className="sc-bar">
        <div className="sc-sort">
          <button className={sort === "latest" ? "on" : ""} onClick={() => setSort("latest")}>Latest saved</button>
          <button className={sort === "topic" ? "on" : ""} onClick={() => setSort("topic")}>By topic</button>
        </div>
      </div>

      {(topics.data ?? []).length > 0 && (
        <div className="sc-pills">
          {(topics.data ?? []).map((t) => {
            const on = topicIds.includes(t.id);
            const bc = brandColor(t.color_key as any) ?? brandColor("amber")!;
            return (
              <button
                key={t.id}
                className="sc-pill"
                style={{ background: on ? bc.hex : "#fff", color: on ? bc.onHex : "#4a4a44", borderColor: bc.hex }}
                onClick={() =>
                  setTopicIds((cur) => (cur.includes(t.id) ? cur.filter((x) => x !== t.id) : [...cur, t.id]))
                }
              >
                {t.display_name ?? t.name}
              </button>
            );
          })}
        </div>
      )}

      {saved.isLoading ? (
        <div className="sc-empty">Loading your saved content…</div>
      ) : visible.length === 0 ? (
        <div className="sc-empty">
          Nothing saved yet. Tap the bookmark on any teaching, essay, podcast, or video from Home and it'll show up here.
        </div>
      ) : (
        <div className="sc-list">
          {visible.map((r) => {
            const c = r.content_items!;
            const medium = mediumFor(c.type);
            const t = c.topic_id ? topicMap.get(c.topic_id) : undefined;
            const bc = t ? brandColor(t.color_key as any) ?? brandColor("amber")! : null;
            return (
              <div key={r.id} className="sc-row">
                <span className="sc-ico"><MediumIcon medium={medium} /></span>
                <div className="sc-main">
                  <div className="sc-title">{c.title}</div>
                  <div className="sc-meta">
                    <span>{c.author_name ?? "CoCreate"}</span>
                    <span>·</span>
                    <span>Saved {fmt(r.saved_at)}</span>
                    {t && bc && (
                      <span className="sc-tag" style={{ background: bc.hex, color: bc.onHex }}>
                        {t.display_name ?? t.name}
                      </span>
                    )}
                  </div>
                </div>
                <button className="sc-act" onClick={() => open(r)}>
                  {medium === "listen" ? "Listen" : medium === "watch" ? "Watch" : "Read"}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
