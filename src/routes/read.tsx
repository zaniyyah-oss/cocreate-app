import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useBibleBooks } from "@/components/BookTagger";
import { useAllTopics, type TopicRow } from "@/components/TopicPicker";
import { BRAND_PALETTE, brandColor, type BrandColorKey } from "@/lib/brand-palette";
import { stripHtml } from "@/components/RichTextField";
import { SavedDevotionalsSection } from "@/components/SavedDevotionals";

export const Route = createFileRoute("/read")({
  head: () => ({
    meta: [
      { title: "Read — Your Bible library on CoCreate" },
      { name: "description", content: "Every study you've saved, grouped by book of the Bible." },
      { property: "og:title", content: "Read — Your Bible library on CoCreate" },
      { property: "og:description", content: "Every study you've saved, grouped by book of the Bible." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ReadLibrary,
});

type RecentEntry = {
  id: string;
  entry_date: string | null;
  entry_title: string | null;
  scripture_reference: string | null;
  scripture_text: string | null;
  book_of_bible: string | null;
  books_of_bible: string[] | null;
  topic_ids: string[] | null;
};

function entryBooks(e: {
  book_of_bible: string | null;
  books_of_bible: string[] | null;
}): string[] {
  const arr = Array.isArray(e.books_of_bible) ? e.books_of_bible : [];
  if (arr.length > 0) return arr;
  return e.book_of_bible ? [e.book_of_bible] : [];
}

function useConfirmedCounts() {
  return useQuery({
    queryKey: ["read-confirmed-counts"],
    queryFn: async () => {
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes?.user?.id;
      if (!uid) return {} as Record<string, number>;
      const { data, error } = await supabase
        .from("devotional_entries")
        .select("book_of_bible,books_of_bible")
        .eq("user_id", uid)
        .eq("book_confirmed", true);
      if (error) throw error;
      const counts: Record<string, number> = {};
      for (const row of data ?? []) {
        const books = entryBooks(row as any);
        for (const k of books) counts[k] = (counts[k] ?? 0) + 1;
      }
      return counts;
    },
    staleTime: 30_000,
  });
}

function useRecentStudies() {
  return useQuery({
    queryKey: ["read-recent-studies"],
    queryFn: async () => {
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes?.user?.id;
      if (!uid) return [] as RecentEntry[];
      const { data, error } = await supabase
        .from("devotional_entries")
        .select("id,entry_date,entry_title,scripture_reference,scripture_text,book_of_bible,books_of_bible,book_confirmed,topic_ids")
        .eq("user_id", uid)
        .eq("book_confirmed", true)
        .order("entry_date", { ascending: false })
        .limit(60);
      if (error) throw error;
      return ((data ?? []) as RecentEntry[]).filter((e) => entryBooks(e).length > 0);
    },
    staleTime: 30_000,
  });
}

function ReadLibrary() {
  const qc = useQueryClient();
  const booksQ = useBibleBooks();
  const countsQ = useConfirmedCounts();
  const recentQ = useRecentStudies();
  const topicsQ = useAllTopics();
  const [section, setSection] = useState<"studies" | "devotionals" | "saved">("studies");
  const [tab, setTab] = useState<"OT" | "NT">("OT");
  const [filterTopicIds, setFilterTopicIds] = useState<string[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);
  const [view, setView] = useState<"tiles" | "list">("tiles");
  const [listSort, setListSort] = useState<"recent" | "book" | "topic">("recent");
  const [openEntry, setOpenEntry] = useState<RecentEntry | null>(null);

  const books = booksQ.data ?? [];
  const counts = countsQ.data ?? {};
  const recent = recentQ.data ?? [];
  const topics = topicsQ.data ?? [];
  const topicById = useMemo(() => {
    const m = new Map<string, { id: string; name: string; display_name: string | null }>();
    for (const t of topics) m.set(t.id, t as any);
    return m;
  }, [topics]);
  const bookFullName = useMemo(() => {
    const m = new Map<string, string>();
    for (const b of books) m.set(b.abbreviation, b.full_name);
    return m;
  }, [books]);

  // Books mentioned by entries matching selected topics (AND semantics).
  const topicBookSet = useMemo(() => {
    if (filterTopicIds.length === 0) return null;
    const s = new Set<string>();
    for (const e of recent) {
      const ids = e.topic_ids ?? [];
      if (filterTopicIds.every((t) => ids.includes(t))) {
        for (const b of entryBooks(e)) s.add(b);
      }
    }
    return s;
  }, [filterTopicIds, recent]);

  const filteredRecent = useMemo(() => {
    if (filterTopicIds.length === 0) return recent;
    return recent.filter((e) => {
      const ids = e.topic_ids ?? [];
      return filterTopicIds.every((t) => ids.includes(t));
    });
  }, [recent, filterTopicIds]);

  // Only surface topics that have at least one entry.
  const availableTopics = useMemo(() => {
    const used = new Set<string>();
    for (const e of recent) (e.topic_ids ?? []).forEach((id) => used.add(id));
    return topics.filter((t) => used.has(t.id));
  }, [recent, topics]);

  const filtered = books.filter((b) => b.testament === tab);
  const totalForTab = filtered.length;

  const fmtDate = (d: string | null) =>
    d ? new Date(d + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "";

  // Group entries for the list view
  const grouped = useMemo(() => {
    if (listSort === "recent") {
      return [{ key: "all", label: "Most recent", items: filteredRecent }];
    }
    if (listSort === "book") {
      const map = new Map<string, RecentEntry[]>();
      for (const e of filteredRecent) {
        const books = entryBooks(e);
        if (books.length === 0) {
          if (!map.has("—")) map.set("—", []);
          map.get("—")!.push(e);
        } else {
          for (const k of books) {
            if (!map.has(k)) map.set(k, []);
            map.get(k)!.push(e);
          }
        }
      }
      return Array.from(map.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([key, items]) => ({ key, label: bookFullName.get(key) ?? key, items }));
    }
    // topic
    const map = new Map<string, RecentEntry[]>();
    for (const e of filteredRecent) {
      const ids = e.topic_ids ?? [];
      if (ids.length === 0) {
        if (!map.has("__none")) map.set("__none", []);
        map.get("__none")!.push(e);
      } else {
        for (const id of ids) {
          if (!map.has(id)) map.set(id, []);
          map.get(id)!.push(e);
        }
      }
    }
    return Array.from(map.entries())
      .map(([key, items]) => {
        const label =
          key === "__none"
            ? "Untagged"
            : topicById.get(key)?.display_name ?? topicById.get(key)?.name ?? "Topic";
        return { key, label, items };
      })
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [filteredRecent, listSort, bookFullName, topicById]);

  const [newStudyBusy, setNewStudyBusy] = useState(false);
  const handleNewStudy = async () => {
    if (newStudyBusy) return;
    setNewStudyBusy(true);
    try {
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes?.user?.id;
      if (!uid) return;
      const { data: tpl } = await supabase
        .from("devotional_templates")
        .select("id")
        .eq("is_default", true)
        .maybeSingle();
      const templateId = (tpl as any)?.id ?? null;
      const today = new Date().toISOString().slice(0, 10);
      const { data, error } = await supabase
        .from("devotional_entries")
        .insert({ user_id: uid, template_id: templateId, entry_date: today } as any)
        .select("id,entry_date,entry_title,scripture_reference,scripture_text,book_of_bible,books_of_bible,topic_ids")
        .single();
      if (error) throw error;
      setOpenEntry(data as RecentEntry);
    } catch {
      // ignore — user may be offline or not signed in
    } finally {
      setNewStudyBusy(false);
    }
  };

  return (
    <AppShell>
      <div style={{ background: "#FBF8ED", minHeight: "100vh", width: "100%" }}>
      <style>{`
        .rd-wrap{
          max-width:1280px;margin:0 auto;padding:28px 32px 96px;
          font-family:'Poppins',sans-serif;color:#20201C;
        }
        .rd-topbar{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;margin-bottom:36px;}
        .rd-tabs{
          display:inline-flex;background:#fff;border-radius:999px;padding:5px;
          border:1.5px solid #ECE4CE;
        }
        .rd-tabs button{
          border:none;background:transparent;padding:11px 26px;border-radius:999px;
          font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;color:#6b6a60;
          transition:all .15s ease;
        }
        .rd-tabs button.active{background:#181A4D;color:#fff;}

        .rd-subnav{
          display:inline-flex;gap:6px;background:#fff;border:1.5px solid #ECE4CE;
          border-radius:999px;padding:5px;width:fit-content;margin:0 0 32px;
        }
        .rd-subnav button{
          border:none;background:transparent;padding:11px 22px;border-radius:999px;
          font-family:inherit;font-size:14.5px;font-weight:700;cursor:pointer;color:#8a8879;
          transition:background .15s ease, color .15s ease;
        }
        .rd-subnav button.active{background:#181A4D;color:#FBF8ED;}
        .rd-subnav button:not(.active):hover{color:#20201C;}
        .rd-panel{animation:rdFade .18s ease;}
        @keyframes rdFade{from{opacity:0;transform:translateY(4px);}to{opacity:1;transform:none;}}
        .rd-tabsub{font-size:15px;color:#4a4a44;max-width:640px;line-height:1.5;margin:-8px 0 28px;}
        .rd-studybar{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;margin:0 0 28px;}
        .rd-studybar-left{display:flex;align-items:center;gap:12px;flex-wrap:wrap;}
        .rd-newstudy{display:inline-flex;align-items:center;gap:8px;background:#DCE07A;color:#181A4D;border:none;font-family:inherit;font-size:14px;font-weight:800;padding:11px 20px;border-radius:999px;cursor:pointer;transition:background .15s ease;}
        .rd-newstudy:hover{background:#CAC307;}
        .rd-newstudy:disabled{opacity:.6;cursor:default;}
        .rd-filtertoggle{display:inline-flex;align-items:center;gap:8px;background:#fff;border:1.5px solid #ECE4CE;color:#20201C;font-family:inherit;font-size:13.5px;font-weight:700;padding:11px 18px;border-radius:999px;cursor:pointer;transition:border-color .15s ease, background .15s ease, color .15s ease;}
        .rd-filtertoggle:hover{border-color:#FFAE00;}
        .rd-filtertoggle.hasfilter{border-color:#0F4A42;color:#0F4A42;}
        .rd-filtertoggle.open{background:#181A4D;color:#FBF8ED;border-color:#181A4D;}
        .rd-filtertoggle .rd-caret{font-size:10px;transition:transform .15s ease;}
        .rd-filtertoggle.open .rd-caret{transform:rotate(180deg);}
        .rd-fcount{background:#0F4A42;color:#fff;border-radius:999px;font-size:10px;padding:1px 7px;font-weight:800;min-width:16px;text-align:center;}
        .rd-filtertoggle.open .rd-fcount{background:rgba(251,248,237,.25);color:#FBF8ED;}
        .rd-filter-drawer{background:#fff;border:1.5px solid #ECE4CE;border-radius:16px;padding:22px 24px;margin:0 0 28px;animation:rdFade .18s ease;}
        .rd-frow{margin-bottom:20px;}
        .rd-frow:last-child{margin-bottom:0;}
        .rd-flabel{font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#8a8879;margin-bottom:10px;}
        .rd-topicpills{display:flex;flex-wrap:wrap;gap:8px;align-items:center;}
        .rd-tpill{font-size:12px;font-weight:800;padding:8px 14px;border-radius:999px;letter-spacing:.04em;text-transform:uppercase;border:1.5px solid #ECE4CE;background:#fff;color:#4a4a44;cursor:pointer;font-family:inherit;transition:all .15s ease;}
        .rd-tpill:hover{border-color:#FFAE00;color:#20201C;}
        .rd-tpill.on{background:#0F4A42;color:#fff;border-color:#0F4A42;}
        .rd-tpill.clear{border-style:dashed;color:#8a8879;text-transform:none;letter-spacing:0;}

        .rd-allstudies{
          display:inline-flex;align-items:center;gap:8px;color:#0F4A42;
          font-size:14px;font-weight:700;text-decoration:none;
        }
        .rd-allstudies:hover{color:#0a332d;}

        .rd-eyebrow{
          font-size:12px;font-weight:800;letter-spacing:.18em;text-transform:uppercase;color:#0F4A42;
          margin-bottom:14px;
        }
        .rd-h1{
          font-family:'Archivo Black','Poppins',sans-serif;font-weight:900;
          font-size:64px;line-height:1;letter-spacing:-.02em;margin:0 0 20px;color:#20201C;
        }
        .rd-sub{font-size:16px;line-height:1.5;color:#4a4a44;max-width:640px;margin:0 0 28px;}

        .rd-build{
          display:flex;gap:24px;flex-wrap:wrap;align-items:center;justify-content:space-between;
          background:#181A4D;color:#FBF8ED;border-radius:18px;padding:24px 26px;margin:0 0 32px;
        }
        .rd-build-copy{flex:1;min-width:260px;}
        .rd-build-copy h2{font-family:'Archivo Black','Poppins',sans-serif;font-size:24px;font-weight:900;margin:0 0 8px;color:#FBF8ED;}
        .rd-build-copy p{font-size:14px;line-height:1.5;margin:0 0 16px;color:rgba(251,248,237,.82);max-width:460px;}
        .rd-build-cta{
          display:inline-flex;align-items:center;gap:6px;background:#DCE07A;color:#181A4D;
          text-decoration:none;font-size:13px;font-weight:800;padding:10px 18px;border-radius:999px;
        }
        .rd-build-cta:hover{background:#CAC307;}
        .rd-build-lens{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;min-width:280px;flex:1;}
        .rd-lencard{
          display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;
          background:#FBF8ED;border:1.5px solid #ECE4CE;border-radius:12px;padding:16px 6px;
          text-decoration:none;color:#20201C;transition:all .15s ease;min-height:72px;
        }
        .rd-lencard:hover{border-color:#FFAE00;transform:translateY(-1px);}
        .rd-lencard .n{font-family:'Archivo Black','Poppins',sans-serif;font-size:22px;font-weight:900;line-height:1;}
        .rd-lencard .l{font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#8a8879;}


        .rd-stat{
          display:inline-flex;align-items:center;gap:18px;background:#fff;
          border:1.5px solid #ECE4CE;border-radius:14px;padding:16px 22px;margin-bottom:44px;
        }
        .rd-stat .num{
          font-family:'Archivo Black','Poppins',sans-serif;font-size:42px;line-height:1;
          color:#0F4A42;font-weight:900;
        }
        .rd-stat .lbl{font-size:14px;line-height:1.3;color:#4a4a44;max-width:120px;}

        .rd-section-label{
          font-size:12px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:#8a8879;
          margin:0 0 14px;
        }

        .rd-grid{
          display:grid;grid-template-columns:repeat(13,minmax(0,1fr));gap:10px;margin-bottom:56px;
        }
        @media (max-width:1024px){.rd-grid{grid-template-columns:repeat(8,minmax(0,1fr));}}
        @media (max-width:640px){.rd-grid{grid-template-columns:repeat(4,minmax(0,1fr));}}

        .rd-chip{
          position:relative;display:flex;align-items:center;justify-content:center;
          padding:16px 8px;border-radius:12px;border:1.5px solid #ECE4CE;background:#fff;
          text-decoration:none;color:#8a8879;font-size:14px;font-weight:700;
          transition:all .15s ease;min-height:52px;
        }
        .rd-chip:hover{border-color:#FFAE00;color:#20201C;}
        .rd-chip.on{
          background:#FFF4D6;border-color:#FFAE00;color:#20201C;
        }
        .rd-chip.on:hover{background:#FFEBB8;}
        .rd-badge{
          position:absolute;top:-6px;right:-6px;background:#DCE07A;color:#181A4D;
          font-size:10px;font-weight:800;border-radius:999px;min-width:20px;height:20px;
          display:inline-flex;align-items:center;justify-content:center;padding:0 5px;
          border:2px solid #FBF8ED;
        }

        .rd-recent-header{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:14px;}
        .rd-viewtoggle{display:inline-flex;background:#fff;border:1.5px solid #ECE4CE;border-radius:999px;padding:4px;}
        .rd-viewtoggle button{border:none;background:transparent;padding:7px 16px;border-radius:999px;font-family:inherit;font-size:12px;font-weight:700;cursor:pointer;color:#6b6a60;letter-spacing:.06em;text-transform:uppercase;}
        .rd-viewtoggle button.active{background:#181A4D;color:#fff;}
        .rd-listsort{display:inline-flex;gap:6px;align-items:center;font-size:11px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:#8a8879;}
        .rd-listsort select{appearance:none;-webkit-appearance:none;border:1.5px solid #ECE4CE;background:#fff;border-radius:999px;padding:6px 28px 6px 12px;font-family:inherit;font-size:12px;font-weight:700;color:#181A4D;cursor:pointer;background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'><path fill='%23181A4D' d='M6 8L0 0h12z'/></svg>");background-repeat:no-repeat;background-position:right 10px center;background-size:9px 6px;letter-spacing:normal;text-transform:none;}

        .rd-recent-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px;}
        @media (max-width:900px){.rd-recent-grid{grid-template-columns:1fr;}}
        .rd-card{
          background:#fff;border:1.5px solid #ECE4CE;border-radius:16px;padding:20px 22px;
          text-decoration:none;color:#20201C;display:flex;flex-direction:column;gap:12px;
          transition:border-color .15s ease;
        }
        .rd-card:hover{border-color:#FFAE00;}
        .rd-card-top{display:flex;align-items:center;justify-content:space-between;}
        .rd-pill{
          background:#FFAE00;color:#20201C;font-size:11px;font-weight:800;
          padding:6px 14px;border-radius:999px;letter-spacing:.06em;text-transform:uppercase;
        }
        .rd-focus{
          display:inline-flex;align-items:center;gap:6px;background:#181A4D;border:1.5px solid #181A4D;
          color:#fff;font-size:12px;font-weight:800;padding:6px 14px;border-radius:999px;cursor:pointer;
          font-family:inherit;letter-spacing:.04em;
        }
        .rd-focus:hover{background:#0F4A42;border-color:#0F4A42;}
        .rd-card-title{
          font-family:'Archivo Black','Poppins',sans-serif;font-size:22px;font-weight:900;
          line-height:1.15;margin:4px 0 0;color:#20201C;
        }
        .rd-card-meta{font-size:13px;color:#8a8879;font-weight:600;}
        .rd-card-snip{
          font-size:14px;line-height:1.55;color:#4a4a44;
          display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;
        }
        .rd-topicfilter{display:flex;flex-wrap:wrap;align-items:center;gap:10px;margin:0 0 24px;}
        .rd-topicfilter .lbl{font-size:11px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:#8a8879;}
        .rd-tchip{font-size:11px;font-weight:800;padding:6px 12px;border-radius:999px;letter-spacing:.06em;text-transform:uppercase;border:1.5px solid #ECE4CE;background:#fff;color:#4a4a44;cursor:pointer;font-family:inherit;}
        .rd-tchip:hover{border-color:#FFAE00;color:#20201C;}
        .rd-tchip.on{background:#0F4A42;color:#fff;border-color:#0F4A42;}
        .rd-tchip.clear{border-style:dashed;color:#8a8879;text-transform:none;letter-spacing:0;}
        .rd-chip.dim{opacity:.35;}

        /* Topics section */
        .rd-topics-head{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin:0 0 14px;}
        .rd-topics-row{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:44px;}
        .rd-topic-pill{display:inline-flex;align-items:center;gap:6px;padding:4px 4px 4px 14px;border-radius:999px;font-size:12px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;border:1.5px solid transparent;cursor:default;font-family:inherit;transition:transform .08s ease, box-shadow .08s ease;}
        .rd-topic-pill:hover{transform:translateY(-1px);}
        .rd-topic-pill.on{box-shadow:0 0 0 2px #FBF8ED, 0 0 0 4px #181A4D;}
        .rd-topic-pill.deleting{opacity:.5;pointer-events:none;}
        .rd-topic-pill-toggle{display:inline-flex;align-items:center;gap:8px;cursor:pointer;outline:none;}
        .rd-topic-pill .count{background:rgba(255,255,255,.35);color:inherit;font-size:10px;padding:2px 7px;border-radius:999px;min-width:18px;text-align:center;}
        .rd-topic-delete{display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:999px;border:none;background:transparent;color:inherit;font-size:16px;line-height:1;cursor:pointer;padding:0;opacity:.55;transition:opacity .12s, background .12s;}
        .rd-topic-delete:hover{opacity:1;background:rgba(0,0,0,0.12);}
        .rd-topic-add{border:1.5px dashed #ECE4CE;background:transparent;color:#8a8879;padding:8px 14px;border-radius:999px;font-size:12px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;cursor:pointer;font-family:inherit;}
        .rd-topic-add:hover{border-color:#FFAE00;color:#20201C;}
        .rd-topic-form{background:#fff;border:1.5px solid #ECE4CE;border-radius:14px;padding:14px 16px;display:flex;flex-direction:column;gap:10px;width:100%;max-width:520px;}
        .rd-topic-form input{border:1px solid #ECE4CE;border-radius:8px;padding:8px 10px;font-family:inherit;font-size:14px;}
        .rd-topic-form .row{display:flex;flex-wrap:wrap;gap:6px;align-items:center;}
        .rd-topic-form .sw{width:26px;height:26px;border-radius:999px;border:1px solid rgba(20,20,20,0.15);cursor:pointer;padding:0;}
        .rd-topic-form .sw[aria-pressed="true"]{box-shadow:0 0 0 2px #FBF8ED, 0 0 0 4px #181A4D;}
        .rd-topic-form .actions{display:flex;gap:8px;justify-content:flex-end;}
        .rd-topic-form button.save{background:#181A4D;color:#fff;border:none;border-radius:999px;padding:8px 16px;font-family:inherit;font-size:12px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;cursor:pointer;}
        .rd-topic-form button.save:disabled{opacity:.5;cursor:not-allowed;}
        .rd-topic-form button.cancel{background:transparent;color:#8a8879;border:none;font-family:inherit;font-size:12px;font-weight:700;cursor:pointer;}

        /* List view (Apple-Notes style) */
        .rd-listframe{display:grid;grid-template-columns:340px 1fr;gap:0;background:#fff;border:1.5px solid #ECE4CE;border-radius:16px;overflow:hidden;min-height:560px;}
        @media (max-width:820px){.rd-listframe{grid-template-columns:1fr;}}
        .rd-list-col{border-right:1px solid rgba(24,26,77,.07);display:flex;flex-direction:column;background:#fff;}
        @media (max-width:820px){.rd-list-col{border-right:none;border-bottom:1px solid rgba(24,26,77,.07);max-height:340px;}}
        .rd-list-scroll{overflow-y:auto;flex:1;}
        .rd-list-group{padding:14px 18px 6px;font-size:10px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:#8a8879;border-bottom:1px solid rgba(24,26,77,.05);background:#FBF8ED;}
        .rd-list-row{padding:14px 18px;border-bottom:1px solid rgba(24,26,77,.05);cursor:pointer;background:#fff;text-align:left;width:100%;border:none;border-left:3px solid transparent;font-family:inherit;}
        .rd-list-row:hover{background:#FBF8ED;}
        .rd-list-row.open{background:rgba(220,224,122,.28);border-left-color:#CAC307;padding-left:15px;}
        .rd-list-top{display:flex;justify-content:space-between;align-items:baseline;gap:8px;margin-bottom:5px;}
        .rd-list-title{font-weight:700;font-size:13px;color:#20201C;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
        .rd-list-date{font-size:10px;color:#9a968a;font-weight:600;flex-shrink:0;}
        .rd-list-meta{font-size:11px;color:#8a8879;line-height:1.4;}
        .rd-list-preview{font-size:11px;color:#8a8678;line-height:1.4;margin-top:5px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}
        .rd-detail{padding:22px 26px;overflow-y:auto;display:flex;flex-direction:column;}
        .rd-detail-empty{display:flex;align-items:center;justify-content:center;color:#8a8879;font-size:13px;padding:40px;text-align:center;}

        /* Full-screen overlay */
        .rd-full{position:fixed;inset:0;background:#FBF8ED;z-index:100;display:flex;flex-direction:column;font-family:'Poppins',sans-serif;}
        .rd-full-bar{display:flex;align-items:center;justify-content:space-between;padding:16px 24px;border-bottom:1px solid #ECE4CE;background:#fff;}
        .rd-full-back{display:inline-flex;align-items:center;gap:8px;background:transparent;border:none;font-family:inherit;font-size:14px;font-weight:700;color:#181A4D;cursor:pointer;padding:6px 8px;border-radius:8px;}
        .rd-full-back:hover{background:rgba(24,26,77,.06);}
        .rd-full-meta{font-size:12px;color:#8a8879;font-weight:600;}
        .rd-full-body{flex:1;overflow-y:auto;padding:32px max(24px,5vw) 80px;max-width:920px;width:100%;margin:0 auto;box-sizing:border-box;}
        .rd-full-title{font-family:'Archivo Black','Poppins',sans-serif;font-weight:900;font-size:42px;line-height:1.1;color:#20201C;margin:0 0 8px;}
        .rd-full-sub{font-size:13px;color:#8a8879;font-weight:600;margin-bottom:24px;}
        .rd-full-textarea{width:100%;min-height:60vh;resize:vertical;border:1px solid #ECE4CE;background:#fff;border-radius:12px;padding:20px;font-family:inherit;font-size:16px;line-height:1.6;color:#20201C;box-sizing:border-box;}
        .rd-full-status{font-size:12px;color:#8a8879;margin-top:10px;}
      `}</style>

      <div className="rd-wrap">
        <div className="rd-eyebrow">Workspace · Read</div>
        <h1 className="rd-h1">Read</h1>
        <p className="rd-sub">
          Every study you've saved, grouped by book of the Bible. Click a book to see everything you've written on it.
        </p>

        <div className="rd-subnav" role="tablist">
          <button role="tab" className={section === "studies" ? "active" : ""} onClick={() => setSection("studies")}>Studies</button>
          <button role="tab" className={section === "devotionals" ? "active" : ""} onClick={() => setSection("devotionals")}>Devotionals</button>
          <button role="tab" className={section === "saved" ? "active" : ""} onClick={() => setSection("saved")}>Saved</button>
        </div>

        {section === "studies" && (
          <div className="rd-panel">
            <p className="rd-tabsub">Every reflection you've logged, whenever you write it. Click a book to see everything you've studied on it.</p>

            <div className="rd-studybar">
              <button
                type="button"
                className="rd-newstudy"
                onClick={handleNewStudy}
                disabled={newStudyBusy}
              >
                <span aria-hidden style={{ fontSize: 16, lineHeight: 1 }}>+</span> New study
              </button>
              <div className="rd-viewtoggle" role="tablist">
                <button className={view === "tiles" ? "active" : ""} onClick={() => setView("tiles")}>Tiles</button>
                <button className={view === "list" ? "active" : ""} onClick={() => setView("list")}>List</button>
              </div>
            </div>

            <div className="rd-topbar">
              <div className="rd-tabs" role="tablist">
                <button role="tab" className={tab === "OT" ? "active" : ""} onClick={() => setTab("OT")}>Old Testament</button>
                <button role="tab" className={tab === "NT" ? "active" : ""} onClick={() => setTab("NT")}>New Testament</button>
              </div>
              <Link to="/notes" className="rd-allstudies">→ All studies</Link>
            </div>


            {availableTopics.length > 0 && (
              <div className="rd-topicfilter">
                <span className="lbl">Filter by topic</span>
                {availableTopics.map((t) => {
                  const on = filterTopicIds.includes(t.id);
                  return (
                    <button
                      key={t.id}
                      type="button"
                      className={`rd-tchip ${on ? "on" : ""}`}
                      onClick={() =>
                        setFilterTopicIds((cur) =>
                          cur.includes(t.id) ? cur.filter((x) => x !== t.id) : [...cur, t.id]
                        )
                      }
                    >
                      {t.display_name ?? t.name}
                    </button>
                  );
                })}
                {filterTopicIds.length > 0 && (
                  <button type="button" className="rd-tchip clear" onClick={() => setFilterTopicIds([])}>
                    Clear
                  </button>
                )}
              </div>
            )}

            <div className="rd-section-label">
              {tab === "OT" ? "Old Testament" : "New Testament"} — {totalForTab} books
            </div>

            <div className="rd-grid">
              {filtered.map((b) => {
                const n = counts[b.abbreviation] ?? 0;
                const dim = topicBookSet !== null && !topicBookSet.has(b.abbreviation);
                return (
                  <Link
                    key={b.abbreviation}
                    to="/read/$abbr"
                    params={{ abbr: b.abbreviation }}
                    search={{} as any}
                    className={`rd-chip ${n > 0 ? "on" : ""} ${dim ? "dim" : ""}`}
                    title={b.full_name}
                  >
                    {b.abbreviation}
                    {n > 0 && <span className="rd-badge">{n}</span>}
                  </Link>
                );
              })}
            </div>

            <TopicsSection
              topics={topics}
              entries={recent}
              selectedIds={filterTopicIds}
              onToggle={(id) =>
                setFilterTopicIds((cur) =>
                  cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]
                )
              }
              onDelete={(id) => setFilterTopicIds((cur) => cur.filter((x) => x !== id))}
            />

            {filteredRecent.length > 0 && (
              <>
                <div className="rd-recent-header">
                  <div className="rd-section-label" style={{ margin: 0 }}>
                    {filterTopicIds.length > 0 ? "Matching studies" : "Recently studied"}
                  </div>
                  <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                    {view === "list" && (
                      <label className="rd-listsort">
                        Sort
                        <select value={listSort} onChange={(e) => setListSort(e.target.value as any)}>
                          <option value="recent">Most recent</option>
                          <option value="book">By book</option>
                          <option value="topic">By topic</option>
                        </select>
                      </label>
                    )}
                  </div>
                </div>

                {view === "tiles" ? (
                  <div className="rd-recent-grid">
                    {filteredRecent.map((e) => (
                      <RecentStudyCard
                        key={e.id}
                        entry={e}
                        fmtDate={fmtDate}
                        onOpen={() => setOpenEntry(e)}
                      />
                    ))}
                  </div>
                ) : (
                  <ListView
                    groups={grouped}
                    fmtDate={fmtDate}
                    bookFullName={bookFullName}
                    onOpen={(e) => setOpenEntry(e)}
                  />
                )}
              </>
            )}
          </div>
        )}

        {section === "devotionals" && (
          <div className="rd-panel">
            <p className="rd-tabsub">Build a multi-day devotional and keep everything you've built in one place.</p>

            <div className="rd-build">
              <div className="rd-build-copy">
                <h2>Create your own devotional</h2>
                <p>Pick a length, choose a color, and shape what you'll read, pray, and do each day.</p>
                <Link to="/plans/new" search={{ length: 3 }} className="rd-build-cta">Start building →</Link>
              </div>
              <div className="rd-build-lens">
                {[1, 3, 5, 10].map((n) => (
                  <Link key={n} to="/plans/new" search={{ length: n }} className="rd-lencard">
                    <span className="n">{n}</span>
                    <span className="l">{n === 1 ? "Day" : "Days"}</span>
                  </Link>
                ))}
              </div>
            </div>

            <SavedDevotionalsSection
              title="Your devotionals"
              note="Everything you've built, in one place"
              emptyText="You haven't built one yet. Use the builder above to start."
            />
          </div>
        )}

        {section === "saved" && (
          <div className="rd-panel">
            <p className="rd-tabsub">Save teachings, essays, podcasts, and videos to come back to later.</p>
            <div className="rd-stat" style={{ display: "block", textAlign: "center", padding: "48px 24px" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>⌘</div>
              <div className="rd-section-label" style={{ margin: "0 0 8px" }}>Saved content</div>
              <div style={{ fontSize: 14, color: "#8a8879", maxWidth: 420, margin: "0 auto", lineHeight: 1.5 }}>
                Nothing saved yet. Once the saved-content model is ready, you'll find everything you've bookmarked to read, listen to, or watch right here.
              </div>
            </div>
          </div>
        )}
      </div>
      </div>

      {openEntry && (
        <FullScreenNote
          entry={openEntry}
          bookFullName={entryBooks(openEntry).map((b) => bookFullName.get(b) ?? b).join(" · ")}
          onClose={() => { setOpenEntry(null); qc.invalidateQueries({ queryKey: ["read-recent-studies"] }); qc.invalidateQueries({ queryKey: ["read-confirmed-counts"] }); }}
        />
      )}
    </AppShell>
  );
}

function ListView({
  groups,
  fmtDate,
  bookFullName,
  onOpen,
}: {
  groups: { key: string; label: string; items: RecentEntry[] }[];
  fmtDate: (d: string | null) => string;
  bookFullName: Map<string, string>;
  onOpen: (e: RecentEntry) => void;
}) {
  const flatFirst = groups.flatMap((g) => g.items)[0] ?? null;
  const [selectedId, setSelectedId] = useState<string | null>(flatFirst?.id ?? null);
  useEffect(() => {
    if (!selectedId && flatFirst) setSelectedId(flatFirst.id);
  }, [flatFirst, selectedId]);

  const selected =
    groups.flatMap((g) => g.items).find((e) => e.id === selectedId) ?? null;

  return (
    <div className="rd-listframe">
      <aside className="rd-list-col">
        <div className="rd-list-scroll">
          {groups.map((g) => (
            <div key={g.key}>
              {(groups.length > 1 || g.key !== "all") && (
                <div className="rd-list-group">{g.label} · {g.items.length}</div>
              )}
              {g.items.map((e) => {
                const isOpen = e.id === selectedId;
                const preview = stripHtml(e.scripture_text).slice(0, 120);
                return (
                  <button
                    key={`${g.key}-${e.id}`}
                    className={`rd-list-row ${isOpen ? "open" : ""}`}
                    onClick={() => setSelectedId(e.id)}
                  >
                    <div className="rd-list-top">
                      <span className="rd-list-title">
                        {e.entry_title || e.scripture_reference || "Untitled study"}
                      </span>
                      <span className="rd-list-date">{fmtDate(e.entry_date)}</span>
                    </div>
                    <div className="rd-list-meta">
                      {entryBooks(e).map((b) => bookFullName.get(b) ?? b).join(" · ")}
                    </div>
                    {preview && <div className="rd-list-preview">{preview}</div>}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </aside>
      <section className="rd-detail">
        {!selected ? (
          <div className="rd-detail-empty">Select a study on the left to read it.</div>
        ) : (
          <DetailPane
            entry={selected}
            fmtDate={fmtDate}
            bookFullName={entryBooks(selected).map((b) => bookFullName.get(b) ?? b).join(" · ")}
            onOpen={() => onOpen(selected)}
          />
        )}
      </section>
    </div>
  );
}

function DetailPane({
  entry,
  fmtDate,
  bookFullName,
  onOpen,
}: {
  entry: RecentEntry;
  fmtDate: (d: string | null) => string;
  bookFullName: string;
  onOpen: () => void;
}) {
  const [note, setNote] = useState(entry.scripture_text ?? "");
  const [status, setStatus] = useState<"" | "saving" | "saved" | "error">("");
  const timer = useRef<number | null>(null);

  useEffect(() => {
    setNote(entry.scripture_text ?? "");
    setStatus("");
  }, [entry.id, entry.scripture_text]);

  const save = async (val: string) => {
    setStatus("saving");
    const { error } = await supabase
      .from("devotional_entries")
      .update({ scripture_text: val })
      .eq("id", entry.id);
    setStatus(error ? "error" : "saved");
    if (!error) window.setTimeout(() => setStatus(""), 1500);
  };

  const schedule = (val: string) => {
    setNote(val);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => save(val), 700);
  };

  return (
    <>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 8 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".14em", textTransform: "uppercase", color: "#0F4A42", marginBottom: 6 }}>
            {bookFullName}
          </div>
          <h2 style={{ fontFamily: "'Archivo Black','Poppins',sans-serif", fontSize: 26, margin: 0, lineHeight: 1.1, color: "#20201C" }}>
            {entry.entry_title || entry.scripture_reference || "Untitled study"}
          </h2>
          <div style={{ fontSize: 12, color: "#8a8879", fontWeight: 600, marginTop: 4 }}>
            {fmtDate(entry.entry_date)}
          </div>
        </div>
        <button className="rd-focus" onClick={onOpen}>Open</button>
      </div>
      <textarea
        value={note}
        placeholder="Add a note from your reading…"
        onChange={(e) => schedule(e.target.value)}
        onBlur={() => {
          if (timer.current) {
            window.clearTimeout(timer.current);
            timer.current = null;
          }
          if ((entry.scripture_text ?? "") !== note) save(note);
        }}
        style={{
          width: "100%",
          flex: 1,
          minHeight: 320,
          resize: "vertical",
          border: "1px solid #ECE4CE",
          background: "#FBF8ED",
          borderRadius: 10,
          padding: "14px 16px",
          fontFamily: "inherit",
          fontSize: 14,
          lineHeight: 1.6,
          color: "#20201C",
          marginTop: 12,
          boxSizing: "border-box",
        }}
      />
      <div style={{ fontSize: 11, color: "#8a8879", marginTop: 8, minHeight: 14 }}>
        {status === "saving" && "Saving…"}
        {status === "saved" && "Saved"}
        {status === "error" && "Couldn't save"}
      </div>
    </>
  );
}

function FullScreenNote({
  entry,
  bookFullName,
  onClose,
}: {
  entry: RecentEntry;
  bookFullName: string;
  onClose: () => void;
}) {
  const [note, setNote] = useState(entry.scripture_text ?? "");
  const [status, setStatus] = useState<"" | "saving" | "saved" | "error">("");
  const timer = useRef<number | null>(null);
  const taRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => taRef.current?.focus(), 60);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const save = async (val: string) => {
    setStatus("saving");
    const { error } = await supabase
      .from("devotional_entries")
      .update({ scripture_text: val })
      .eq("id", entry.id);
    setStatus(error ? "error" : "saved");
    if (!error) window.setTimeout(() => setStatus(""), 1500);
  };

  const schedule = (val: string) => {
    setNote(val);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => save(val), 700);
  };

  const fmt = (d: string | null) =>
    d ? new Date(d + "T00:00:00").toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" }) : "";

  return (
    <div className="rd-full" role="dialog" aria-modal="true">
      <div className="rd-full-bar">
        <button
          className="rd-full-back"
          onClick={() => {
            if (timer.current) {
              window.clearTimeout(timer.current);
              timer.current = null;
            }
            if ((entry.scripture_text ?? "") !== note) save(note);
            onClose();
          }}
          aria-label="Back to Read"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          Back
        </button>
        <span className="rd-full-meta">
          {status === "saving" ? "Saving…" : status === "saved" ? "Saved" : status === "error" ? "Couldn't save" : ""}
        </span>
      </div>
      <div className="rd-full-body">
        <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".14em", textTransform: "uppercase", color: "#0F4A42", marginBottom: 10 }}>
          {bookFullName}
        </div>
        <h1 className="rd-full-title">
          {entry.entry_title || entry.scripture_reference || "Untitled study"}
        </h1>
        <div className="rd-full-sub">{fmt(entry.entry_date)}</div>
        <textarea
          ref={taRef}
          className="rd-full-textarea"
          value={note}
          placeholder="Continue your study…"
          onChange={(e) => schedule(e.target.value)}
          onBlur={() => {
            if (timer.current) {
              window.clearTimeout(timer.current);
              timer.current = null;
            }
            if ((entry.scripture_text ?? "") !== note) save(note);
          }}
        />
      </div>
    </div>
  );
}

function RecentStudyCard({
  entry,
  fmtDate,
  onOpen,
}: {
  entry: RecentEntry;
  fmtDate: (d: string | null) => string;
  onOpen: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [note, setNote] = useState(entry.scripture_text ?? "");
  const [status, setStatus] = useState<"" | "saving" | "saved" | "error">("");
  const saveTimer = useRef<number | null>(null);
  const taRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (expanded) {
      const t = window.setTimeout(() => taRef.current?.focus(), 60);
      return () => window.clearTimeout(t);
    }
  }, [expanded]);

  const saveNote = async (val: string) => {
    setStatus("saving");
    const { error } = await supabase
      .from("devotional_entries")
      .update({ scripture_text: val })
      .eq("id", entry.id);
    setStatus(error ? "error" : "saved");
    if (!error) window.setTimeout(() => setStatus(""), 1500);
  };

  const scheduleSave = (val: string) => {
    setNote(val);
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => saveNote(val), 700);
  };

  return (
    <div
      className="rd-card"
      role="button"
      tabIndex={0}
      onClick={() => setExpanded((o) => !o)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setExpanded((o) => !o);
        }
      }}
      style={{ cursor: "pointer" }}
    >
      <div className="rd-card-top" onClick={(e) => e.stopPropagation()}>
        <span className="rd-pill">Read</span>
        <button
          type="button"
          className="rd-focus"
          onClick={(e) => {
            e.stopPropagation();
            onOpen();
          }}
        >
          Open
        </button>
      </div>
      <h3 className="rd-card-title">
        {entry.entry_title || entry.scripture_reference || "Untitled study"}
      </h3>
      <div className="rd-card-meta">
        {entryBooks(entry).join(" · ")}
        {entry.entry_date ? ` · ${fmtDate(entry.entry_date)}` : ""}
      </div>

      {!expanded ? (
        entry.scripture_text ? (
          <div className="rd-card-snip">{stripHtml(entry.scripture_text)}</div>
        ) : (
          <div className="rd-card-snip" style={{ fontStyle: "italic", color: "#8a8879" }}>
            Click to add a note…
          </div>
        )
      ) : (
        <div onClick={(e) => e.stopPropagation()}>
          <textarea
            ref={taRef}
            value={note}
            placeholder="Add a note from your reading…"
            onChange={(e) => scheduleSave(e.target.value)}
            onBlur={() => {
              if (saveTimer.current) {
                window.clearTimeout(saveTimer.current);
                saveTimer.current = null;
              }
              if ((entry.scripture_text ?? "") !== note) saveNote(note);
            }}
            style={{
              width: "100%",
              minHeight: 180,
              resize: "vertical",
              border: "1px solid #ECE4CE",
              background: "#FBF8ED",
              borderRadius: 10,
              padding: "10px 12px",
              fontFamily: "inherit",
              fontSize: 14,
              lineHeight: 1.55,
              color: "#20201C",
            }}
          />
          <div style={{ fontSize: 11, color: "#8a8879", marginTop: 6, minHeight: 14 }}>
            {status === "saving" && "Saving…"}
            {status === "saved" && "Saved"}
            {status === "error" && "Couldn't save"}
            {!status && "Click card again to collapse"}
          </div>
        </div>
      )}
    </div>
  );
}

function TopicsSection({
  topics,
  entries,
  selectedIds,
  onToggle,
  onDelete,
}: {
  topics: TopicRow[];
  entries: RecentEntry[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  onDelete?: (id: string) => void;
}) {
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState<BrandColorKey>("amber");
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      const uid = data?.user?.id ?? null;
      setUserId(uid);
      if (uid) {
        const { data: role } = await supabase.rpc("has_role", { _user_id: uid, _role: "admin" });
        if (role) setIsAdmin(true);
      }
    });
  }, []);

  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of entries) {
      for (const id of e.topic_ids ?? []) m.set(id, (m.get(id) ?? 0) + 1);
    }
    return m;
  }, [entries]);

  const sorted = useMemo(
    () =>
      [...topics].sort((a, b) => {
        const ca = counts.get(a.id) ?? 0;
        const cb = counts.get(b.id) ?? 0;
        if (ca !== cb) return cb - ca;
        return (a.display_name ?? a.name).localeCompare(b.display_name ?? b.name);
      }),
    [topics, counts]
  );

  const slugify = (s: string) =>
    s.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);

  const create = async () => {
    const n = name.trim();
    if (!n || saving) return;
    setSaving(true);
    try {
      const existing = topics.find(
        (t) => (t.display_name ?? t.name).toLowerCase() === n.toLowerCase()
      );
      if (existing) {
        setName("");
        setCreating(false);
        return;
      }
      const baseSlug = slugify(n) || `topic-${Date.now()}`;
      let slug = baseSlug;
      for (let i = 2; topics.some((t) => t.slug === slug); i++) slug = `${baseSlug}-${i}`;
      const { data: userRes } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("topics")
        .insert({ name: n, slug, display_name: n, color_key: color, sort_order: 500, created_by: userRes?.user?.id } as any)
        .select("id,name,slug,display_name,color_key,sort_order,created_by")
        .single();
      if (error) throw error;
      qc.setQueryData<TopicRow[]>(["all-topics"], (cur) => [...(cur ?? []), data as TopicRow]);
      qc.invalidateQueries({ queryKey: ["all-topics"] });
      setName("");
      setCreating(false);
    } catch (e) {
      console.error("create topic failed", e);
    } finally {
      setSaving(false);
    }
  };

  const deleteTopic = async (id: string) => {
    const t = topics.find((x) => x.id === id);
    if (!t || deletingId) return;
    const label = t.display_name ?? t.name;
    const count = counts.get(id) ?? 0;
    const confirmMsg = count > 0
      ? `Delete “${label}”? It will be removed from ${count} study${count === 1 ? "" : "ies"}.`
      : `Delete “${label}”?`;
    if (!window.confirm(confirmMsg)) return;
    setDeletingId(id);
    try {
      const { error } = await supabase.from("topics").delete().eq("id", id);
      if (error) throw error;
      qc.setQueryData<TopicRow[]>(["all-topics"], (cur) => (cur ?? []).filter((x) => x.id !== id));
      qc.invalidateQueries({ queryKey: ["all-topics"] });
      qc.invalidateQueries({ queryKey: ["read-recent-studies"] });
      qc.invalidateQueries({ queryKey: ["hp-topics"] });
      onDelete?.(id);
    } catch (e) {
      console.error("delete topic failed", e);
      alert("Could not delete topic.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      <div className="rd-topics-head">
        <div className="rd-section-label" style={{ margin: 0 }}>Topics</div>
        {!creating && (
          <button className="rd-topic-add" onClick={() => setCreating(true)}>+ New topic</button>
        )}
      </div>
      <div className="rd-topics-row">
        {sorted.length === 0 && !creating && (
          <span style={{ fontSize: 13, color: "#8a8879" }}>
            No topics yet. Create one to tag your studies.
          </span>
        )}
        {sorted.map((t) => {
          const bc = brandColor(t.color_key) ?? brandColor("amber")!;
          const on = selectedIds.includes(t.id);
          const n = counts.get(t.id) ?? 0;
          const canDelete = userId && (t.created_by === userId || isAdmin);
          const isDeleting = deletingId === t.id;
          return (
            <div
              key={t.id}
              className={`rd-topic-pill ${on ? "on" : ""} ${isDeleting ? "deleting" : ""}`}
              style={{ background: bc.hex, color: bc.onHex, borderColor: bc.hex }}
            >
              <span
                className="rd-topic-pill-toggle"
                role="button"
                tabIndex={0}
                onClick={() => onToggle(t.id)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onToggle(t.id); } }}
              >
                {t.display_name ?? t.name}
                {n > 0 && <span className="count">{n}</span>}
              </span>
              {canDelete && (
                <button
                  type="button"
                  className="rd-topic-delete"
                  aria-label={`Delete ${t.display_name ?? t.name}`}
                  title={`Delete ${t.display_name ?? t.name}`}
                  disabled={isDeleting}
                  onClick={(e) => { e.stopPropagation(); void deleteTopic(t.id); }}
                >
                  {isDeleting ? "…" : "×"}
                </button>
              )}
            </div>
          );
        })}
        {creating && (
          <div className="rd-topic-form">
            <input
              autoFocus
              placeholder="Topic name (e.g. Endurance)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); void create(); }
                if (e.key === "Escape") { setCreating(false); setName(""); }
              }}
            />
            <div className="row">
              <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".14em", textTransform: "uppercase", color: "#8a8879", marginRight: 4 }}>
                Color
              </span>
              {BRAND_PALETTE.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  className="sw"
                  aria-pressed={color === c.key}
                  aria-label={c.label}
                  title={c.label}
                  style={{ background: c.hex }}
                  onClick={() => setColor(c.key)}
                />
              ))}
            </div>
            <div className="actions">
              <button className="cancel" onClick={() => { setCreating(false); setName(""); }}>Cancel</button>
              <button className="save" onClick={() => void create()} disabled={!name.trim() || saving}>
                {saving ? "Saving…" : "Create topic"}
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
