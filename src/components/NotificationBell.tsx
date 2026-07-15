import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const BELL_CSS = `
.nb-wrap{position:relative;font-family:'Poppins',sans-serif;}
.nb-btn{position:relative;background:transparent;border:none;width:38px;height:38px;border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;color:#181A4D;transition:background .18s ease;}
.nb-btn:hover{background:#FBF8ED;}
.nb-btn svg{width:20px;height:20px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;}
.nb-badge{position:absolute;top:4px;right:4px;min-width:16px;height:16px;padding:0 4px;border-radius:99px;background:#FF340C;color:#fff;font-size:9.5px;font-weight:900;display:flex;align-items:center;justify-content:center;line-height:1;box-shadow:0 0 0 2px #fff;}
`;

const todayISO = () => {
  const d = new Date(); const y = d.getFullYear(); const m = String(d.getMonth() + 1).padStart(2, "0"); const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
};

/** Once per day, seed a "streak reminder" if the user has practiced before but not today. */
async function maybeSeedStreakReminder(userId: string) {
  const flag = `cocreate:streak-checked:${userId}:${todayISO()}`;
  if (typeof window === "undefined") return;
  if (window.sessionStorage.getItem(flag)) return;
  window.sessionStorage.setItem(flag, "1");

  const today = todayISO();
  const dedupe = `streak_reminder:${today}`;

  const { data: entries } = await supabase
    .from("devotional_entries")
    .select("entry_date")
    .eq("user_id", userId)
    .order("entry_date", { ascending: false })
    .limit(3);
  if (!entries || entries.length === 0) return;
  if (entries.some((e) => e.entry_date === today)) return;

  await supabase.from("notifications").insert({
    user_id: userId,
    kind: "streak_reminder",
    title: "A quiet moment to return",
    body: "Your devotional practice is here whenever you're ready.",
    link_route: "/devotionals",
    link_params: {},
    dedupe_key: dedupe,
  });
}

export function NotificationBell() {
  const [userId, setUserId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUserId(data.session?.user.id ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setUserId(s?.user.id ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => { if (userId) maybeSeedStreakReminder(userId); }, [userId]);

  const countQ = useQuery({
    queryKey: ["notifications-unread", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { count, error } = await supabase.from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId!)
        .is("read_at", null);
      if (error) throw error;
      return count ?? 0;
    },
    refetchInterval: 60_000,
  });

  if (!userId) return null;

  const unread = countQ.data ?? 0;

  return (
    <div className="nb-wrap">
      <style dangerouslySetInnerHTML={{ __html: BELL_CSS }} />
      <button
        className="nb-btn"
        onClick={() => navigate({ to: "/notifications" })}
        aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
      >
        <svg viewBox="0 0 24 24"><path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 01-3.4 0"/></svg>
        {unread > 0 && <span className="nb-badge">{unread > 99 ? "99+" : unread}</span>}
      </button>
    </div>
  );
}
