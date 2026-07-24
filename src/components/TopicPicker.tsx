import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type TopicRow = {
  id: string;
  name: string;
  slug: string;
  display_name: string | null;
  color_key: string | null;
  sort_order?: number | null;
  created_by?: string | null;
};

// Home-page "primary" topics (surfaced first in the picker).
export const PRIMARY_TOPIC_SLUGS = [
  "identity",
  "marriage",
  "parenting",
  "ministry",
  "career",
  "business",
  "church",
];

export function useAllTopics() {
  return useQuery({
    queryKey: ["all-topics"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("topics")
        .select("id,name,slug,display_name,color_key,sort_order,created_by")
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as TopicRow[];
    },
    staleTime: 5 * 60_000,
  });
}

function slugify(s: string) {
  return s
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function TopicPicker({
  value,
  onChange,
  disabled,
  compact,
  placeholder = "+ Add topic",
}: {
  value: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
  compact?: boolean;
  placeholder?: string;
}) {
  const qc = useQueryClient();
  const topicsQ = useAllTopics();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const topics = topicsQ.data ?? [];
  const byId = useMemo(() => {
    const m = new Map<string, TopicRow>();
    topics.forEach((t) => m.set(t.id, t));
    return m;
  }, [topics]);

  const sorted = useMemo(() => {
    const primaryRank = new Map(PRIMARY_TOPIC_SLUGS.map((s, i) => [s, i]));
    return [...topics].sort((a, b) => {
      const ap = primaryRank.has(a.slug) ? (primaryRank.get(a.slug) as number) : 999;
      const bp = primaryRank.has(b.slug) ? (primaryRank.get(b.slug) as number) : 999;
      if (ap !== bp) return ap - bp;
      return (a.display_name ?? a.name).localeCompare(b.display_name ?? b.name);
    });
  }, [topics]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sorted;
    return sorted.filter((t) =>
      (t.display_name ?? t.name).toLowerCase().includes(q) ||
      t.name.toLowerCase().includes(q) ||
      t.slug.includes(q)
    );
  }, [sorted, query]);

  const exactExists = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return sorted.some(
      (t) =>
        (t.display_name ?? t.name).toLowerCase() === q ||
        t.name.toLowerCase() === q
    );
  }, [sorted, query]);

  const toggle = (id: string) => {
    if (disabled) return;
    const next = value.includes(id) ? value.filter((x) => x !== id) : [...value, id];
    onChange(next);
  };

  const createTopic = async () => {
    const name = query.trim();
    if (!name || creating) return;
    setCreating(true);
    try {
      // Try to reuse if a matching topic already exists (case-insensitive).
      const existing = sorted.find(
        (t) => (t.display_name ?? t.name).toLowerCase() === name.toLowerCase()
      );
      if (existing) {
        toggle(existing.id);
        setQuery("");
        return;
      }
      const baseSlug = slugify(name) || `topic-${Date.now()}`;
      // Ensure slug uniqueness by appending a suffix if needed.
      let slug = baseSlug;
      for (let i = 2; sorted.some((t) => t.slug === slug); i++) slug = `${baseSlug}-${i}`;
      const { data, error } = await supabase
        .from("topics")
        .insert({
          name,
          slug,
          display_name: name,
          color_key: "amber",
          sort_order: 500,
        } as any)
        .select("id,name,slug,display_name,color_key,sort_order")
        .single();
      if (error) throw error;
      qc.setQueryData<TopicRow[]>(["all-topics"], (cur) => [...(cur ?? []), data as TopicRow]);
      qc.invalidateQueries({ queryKey: ["all-topics"] });
      qc.invalidateQueries({ queryKey: ["hp-topics"] });
      onChange([...value, (data as TopicRow).id]);
      setQuery("");
    } catch (e) {
      console.error("createTopic failed", e);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="tp-wrap" ref={wrapRef}>
      <style>{`
        .tp-wrap{position:relative;display:flex;flex-wrap:wrap;gap:6px;align-items:center;}
        .tp-chip{display:inline-flex;align-items:center;gap:4px;background:#0F4A42;color:#fff;font-size:11px;font-weight:800;padding:6px 10px;border-radius:999px;letter-spacing:.06em;text-transform:uppercase;}
        .tp-chip button{background:transparent;border:none;color:inherit;font-size:14px;line-height:1;cursor:pointer;padding:0 0 0 2px;}
        .tp-add{font-size:11px;font-weight:700;padding:5px 10px;border-radius:999px;border:1.5px dashed #ECE4CE;background:transparent;color:#8a8879;cursor:pointer;font-family:inherit;}
        .tp-add:hover{border-color:#FFAE00;color:#20201C;}
        .tp-add[disabled]{opacity:.5;cursor:not-allowed;}
        .tp-menu{position:absolute;top:calc(100% + 6px);left:0;z-index:30;background:#fff;border:1.5px solid #ECE4CE;border-radius:12px;padding:8px;min-width:240px;max-height:300px;overflow:auto;box-shadow:0 8px 24px rgba(0,0,0,.08);}
        .tp-menu input{width:100%;border:1px solid #ECE4CE;border-radius:8px;padding:6px 8px;font-size:13px;margin-bottom:6px;font-family:inherit;}
        .tp-opt{display:flex;align-items:center;justify-content:space-between;gap:8px;width:100%;padding:8px 10px;border-radius:8px;border:none;background:transparent;cursor:pointer;font-family:inherit;font-size:13px;color:#20201C;text-align:left;}
        .tp-opt:hover{background:#FBF8ED;}
        .tp-opt.on{background:#FFF4D6;font-weight:700;}
        .tp-create{display:flex;align-items:center;gap:6px;width:100%;padding:8px 10px;border-radius:8px;border:none;background:#F2FBF4;color:#0F4A42;cursor:pointer;font-family:inherit;font-size:13px;font-weight:700;margin-top:4px;}
        .tp-create:hover{background:#E1F5E7;}
        .tp-empty{padding:8px 10px;color:#8a8879;font-size:12px;}
      `}</style>
      {value.map((id) => {
        const t = byId.get(id);
        if (!t) return null;
        return (
          <span key={id} className="tp-chip">
            {t.display_name ?? t.name}
            {!disabled && (
              <button
                type="button"
                aria-label={`Remove ${t.display_name ?? t.name}`}
                onClick={() => toggle(id)}
              >
                ×
              </button>
            )}
          </span>
        );
      })}
      <button
        type="button"
        className="tp-add"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
      >
        {placeholder}
      </button>
      {open && (
        <div className="tp-menu" onClick={(e) => e.stopPropagation()}>
          <input
            autoFocus
            placeholder="Search or create a topic…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && query.trim() && !exactExists) {
                e.preventDefault();
                void createTopic();
              }
            }}
          />
          {filtered.length === 0 && !query.trim() && (
            <div className="tp-empty">No topics yet.</div>
          )}
          {filtered.map((t) => {
            const on = value.includes(t.id);
            return (
              <button
                key={t.id}
                type="button"
                className={`tp-opt ${on ? "on" : ""}`}
                onClick={() => toggle(t.id)}
              >
                <span>{t.display_name ?? t.name}</span>
                {on && <span style={{ color: "#0F4A42" }}>✓</span>}
              </button>
            );
          })}
          {query.trim() && !exactExists && (
            <button type="button" className="tp-create" onClick={() => void createTopic()} disabled={creating}>
              + Create "{query.trim()}"
            </button>
          )}
        </div>
      )}
    </div>
  );
}
