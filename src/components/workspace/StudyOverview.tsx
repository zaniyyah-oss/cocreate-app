import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, ChevronDown, ChevronRight, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import type { DocPage } from "@/lib/doc-pages";
import { buildStudyLog, filterStudyLog, type StudyLogKind, type StudyLogEntry } from "@/lib/study-overview";
import { annoQueryKey, RichBody, type AnnoRow } from "./DocAnnotations";

const categories = [
  { id: "word", label: "Key terms & word studies", filter: "Key terms" },
  { id: "question", label: "Questions & inquiries", filter: "Questions" },
  { id: "note", label: "Notes log", filter: "Notes" },
] as const;

export function StudyOverview({ itemId, pages, onJump }: { itemId: string; pages: DocPage[]; onJump: (pageId: string, annotationId: string) => void }) {
  const [filter, setFilter] = useState<"all" | StudyLogKind>("all");
  const [search, setSearch] = useState("");
  const [grouped, setGrouped] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const query = useQuery({
    queryKey: annoQueryKey(itemId),
    queryFn: async () => {
      const { data, error } = await supabase.from("doc_annotations").select("*").eq("workspace_item_id", itemId).order("created_at");
      if (error) throw error;
      return (data ?? []) as AnnoRow[];
    },
  });
  const entries = useMemo(() => buildStudyLog(pages, query.data ?? []), [pages, query.data]);
  const visible = useMemo(() => filterStudyLog(entries, filter, search), [entries, filter, search]);
  const counts = (kind: StudyLogKind) => entries.filter((e) => e.row.kind === kind).length;

  const renderEntry = (entry: StudyLogEntry) => {
    const { row, pageId, pageTitle, number } = entry;
    const open = expanded === row.id;
    const category = categories.find((c) => c.id === row.kind);
    return (
      <article key={row.id} className={`study-log-entry study-log-${row.kind}${row.resolved_at ? " is-resolved" : ""}`}>
        <div className="study-log-entry-head">
          <Button type="button" variant="ghost" className="study-log-expand" onClick={() => setExpanded(open ? null : row.id)} aria-expanded={open}>
            {open ? <ChevronDown /> : <ChevronRight />}
            <span className="study-log-number">{number ?? "–"}</span>
            <span className="study-log-quote">{row.quote || category?.filter}</span>
          </Button>
          {pageId && <Button type="button" variant="ghost" size="icon" aria-label={`Jump to passage: ${row.quote}`} title="Jump to passage" onClick={() => onJump(pageId, row.id)}><ArrowUpRight /></Button>}
        </div>
        <div className="study-log-meta">{pageTitle} · {category?.filter}{row.resolved_at ? " · Resolved" : ""}</div>
        {row.body && <div className={`study-log-body${open ? "" : " is-clamped"}`}><RichBody text={row.body} /></div>}
      </article>
    );
  };

  return (
    <section className="study-log" aria-label="Study index">
      <div className="study-log-title"><h2>Study index</h2><span>{entries.length}</span></div>
      <div className="study-log-controls">
        <div className="study-log-filters" role="group" aria-label="Study index filters">
          <Button type="button" size="sm" variant={filter === "all" ? "default" : "outline"} aria-pressed={filter === "all"} onClick={() => setFilter("all")}>All {entries.length}</Button>
          {categories.map((c) => <Button key={c.id} type="button" size="sm" variant={filter === c.id ? "default" : "outline"} aria-pressed={filter === c.id} onClick={() => setFilter(c.id)}><span className={`study-log-dot study-log-${c.id}`} />{c.filter} {counts(c.id)}</Button>)}
        </div>
        <label className="study-log-search"><Search aria-hidden="true" /><Input aria-label="Search study index" placeholder="Search this study…" value={search} onChange={(e) => setSearch(e.target.value)} /></label>
        <div className="study-log-group" role="group" aria-label="Study index grouping">
          <Button type="button" size="sm" variant={grouped ? "secondary" : "ghost"} aria-pressed={grouped} onClick={() => setGrouped(true)}>By tab</Button>
          <Button type="button" size="sm" variant={!grouped ? "secondary" : "ghost"} aria-pressed={!grouped} onClick={() => setGrouped(false)}>Timeline</Button>
        </div>
      </div>
      {query.isPending ? <p className="study-log-empty">Loading study index…</p> : query.isError ? <div className="study-log-empty">Couldn’t load the study index. <Button variant="link" onClick={() => void query.refetch()}>Try again</Button></div> : !visible.length ? <p className="study-log-empty">{entries.length ? "No matching annotations." : "No notes, questions or word studies yet."}</p> : grouped ? categories.filter((c) => filter === "all" || c.id === filter).map((c) => {
        const categoryEntries = visible.filter((e) => e.row.kind === c.id);
        if (!categoryEntries.length) return null;
        const groups = [...new Set([...pages.map((p) => p.id), null])];
        return <div className="study-log-category" key={c.id}><h3><span className={`study-log-dot study-log-${c.id}`} />{c.label}<span>{categoryEntries.length}</span></h3>{groups.map((id) => {
          const items = categoryEntries.filter((e) => e.pageId === id);
          return items.length ? <div key={id ?? "detached"} className="study-log-tab"><h4>{items[0].pageTitle}</h4>{items.map(renderEntry)}</div> : null;
        })}</div>;
      }) : <div className="study-log-timeline">{[...visible].sort((a, b) => b.row.created_at.localeCompare(a.row.created_at)).map(renderEntry)}</div>}
    </section>
  );
}