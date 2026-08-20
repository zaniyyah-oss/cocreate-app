import { Link, useRouterState } from "@tanstack/react-router";
import { useMemo } from "react";
import { usePageContent } from "@/lib/page-content";

export type NavKey = "home" | "read" | "explore" | "devotionals" | "calendar" | "saved" | "notes" | "profile" | "library" | "messages";

// Coordinated icon set — 1.8px round stroke, ~26px render size.
// Home: house + door. Workspace: 2x2 rounded grid. Read: open book + text lines.
// Calendar: grid + today dot. Notes: pencil.
const ICON = {
  home:        <svg viewBox="0 0 24 24"><path d="M4 12l8-7 8 7"/><path d="M6 10v9a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-9"/><path d="M10 20v-5h4v5"/></svg>,
  devotionals: <svg viewBox="0 0 24 24"><rect x="3" y="3" width="7.5" height="7.5" rx="1.6"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.6"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.6"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.6"/></svg>,
  read:        <svg viewBox="0 0 24 24"><path d="M3 5.5c2-1.2 4.3-1.5 6.5-.9 1 .27 1.9.7 2.5 1.4v13c-.6-.7-1.5-1.13-2.5-1.4-2.2-.6-4.5-.3-6.5.9z"/><path d="M21 5.5c-2-1.2-4.3-1.5-6.5-.9-1 .27-1.9.7-2.5 1.4v13c.6-.7 1.5-1.13 2.5-1.4 2.2-.6 4.5-.3 6.5.9z"/><path d="M5 8.7h3M5 11.2h3M16 8.7h3M16 11.2h3"/></svg>,
  calendar:    <svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/><circle cx="9" cy="15.5" r="1.6" fill="currentColor" stroke="none"/></svg>,
  notes:       <svg viewBox="0 0 24 24"><path d="M4 20.5l3.2-.9L18.8 8a1.4 1.4 0 0 0 0-2l-1.3-1.3a1.4 1.4 0 0 0-2 0L4.9 16.3z"/><path d="M4 20.5V17"/></svg>,
  explore:     <svg viewBox="0 0 24 24"><path d="M6 3h12v18l-6-4-6 4V3z"/></svg>,
  saved:       <svg viewBox="0 0 24 24"><path d="M6 3h12v18l-6-4-6 4V3z"/></svg>,
  library:     <svg viewBox="0 0 24 24"><path d="M4 4h4v16H4zM10 4h4v16h-4zM16 5l4 1-3 15-4-1z"/></svg>,
  messages:    <svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>,
  profile:     <svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.5-6 8-6s8 2 8 6"/></svg>,
};

function buildMobileNav(labels: Record<string, string>) {
  return [
    { key: "home" as const,        label: labels.home_label        || "Home",      to: "/" },
    { key: "devotionals" as const, label: labels.devotionals_label || "Workspace", to: "/devotionals" },
    { key: "read" as const,        label: labels.read_label        || "Read",       to: "/read" },
    { key: "calendar" as const,    label: labels.calendar_label    || "Calendar",  to: "/calendar" },
    { key: "notes" as const,       label: labels.notes_label       || "Notes",     to: "/notes" },
  ];
}

export function MobileBottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const labelsQ = usePageContent("site_nav");
  const nav = useMemo(() => buildMobileNav(labelsQ.data ?? {}), [labelsQ.data]);

  const isActive = (item: { key: NavKey; to: string; matchPaths?: string[] }) => {
    if (item.matchPaths?.some((p) => pathname === p || pathname.startsWith(p + "/"))) return true;
    if (item.to === "/") return pathname === "/";
    return pathname === item.to || pathname.startsWith(item.to + "/");
  };

  return (
    <nav className="app-bottomnav" aria-label="Primary mobile">
      {nav.map((n) => (
        <Link key={n.key} to={n.to} className={isActive(n) ? "active" : ""} aria-label={n.label} title={n.label}>
          {ICON[n.key]}
        </Link>
      ))}
    </nav>
  );
}
