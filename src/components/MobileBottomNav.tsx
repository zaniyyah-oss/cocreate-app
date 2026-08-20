import { Link, useRouterState } from "@tanstack/react-router";
import { useMemo } from "react";
import { usePageContent } from "@/lib/page-content";

export type NavKey = "home" | "read" | "explore" | "devotionals" | "calendar" | "saved" | "notes" | "profile" | "library" | "messages";

const ICON = {
  home:        <svg viewBox="0 0 24 24"><path d="M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10"/></svg>,
  read:        <svg viewBox="0 0 24 24"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>,
  explore:     <svg viewBox="0 0 24 24"><path d="M6 3h12v18l-6-4-6 4V3z"/></svg>,
  devotionals: <svg viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V4H6.5A2.5 2.5 0 0 0 4 6.5v13z"/><path d="M8 7h8M8 11h5"/></svg>,
  calendar:    <svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18M8 3v4M16 3v4"/></svg>,
  saved:       <svg viewBox="0 0 24 24"><path d="M6 3h12v18l-6-4-6 4V3z"/></svg>,
  notes:       <svg viewBox="0 0 24 24"><path d="M5 4h11l3 3v13H5z"/><path d="M9 9h6M9 13h6M9 17h3"/></svg>,
  library:     <svg viewBox="0 0 24 24"><path d="M4 4h4v16H4zM10 4h4v16h-4zM16 5l4 1-3 15-4-1z"/></svg>,
  messages:    <svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>,
  profile:     <svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.5-6 8-6s8 2 8 6"/></svg>,
};

function buildMobileNav(labels: Record<string, string>) {
  return [
    { key: "home" as const,        label: labels.home_label        || "Home",      to: "/" },
    { key: "read" as const,        label: labels.read_label        || "Read",      to: "/read" },
    { key: "devotionals" as const, label: labels.devotionals_label || "Workspace", to: "/devotionals" },
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
        <Link key={n.key} to={n.to} className={isActive(n) ? "active" : ""}>
          {ICON[n.key]}<span>{n.label}</span>
        </Link>
      ))}
    </nav>
  );
}
