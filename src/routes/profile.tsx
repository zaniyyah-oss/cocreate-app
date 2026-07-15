import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { AppShell } from "@/components/AppShell";
import { trackEvent } from "@/lib/track";
import { DevotionalReminders } from "@/components/DevotionalReminders";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type Topic = Database["public"]["Tables"]["topics"]["Row"];
type Sub = Database["public"]["Tables"]["topic_subscriptions"]["Row"];

export const Route = createFileRoute("/profile")({
  component: ProfilePage,
  head: () => ({
    meta: [
      { title: "Profile — CoCreate" },
      { name: "description", content: "Your CoCreate profile, topic subscriptions, and settings." },
      { property: "og:title", content: "Profile — CoCreate" },
    ],
  }),
});

const TOPIC_COLORS: Record<string, string> = {
  amber: "#F5B301", teal: "#0F4A42", lime: "#DCE07A", "light-green": "#C7E39B",
  coral: "#FF340C", navy: "#181A4D", cream: "#FBF8ED", brown: "#441B07",
};
const topicColor = (k?: string | null) => (k && TOPIC_COLORS[k]) || "#0F4A42";

const CSS = `
.pf-root *{box-sizing:border-box;}
.pf-root{min-height:100vh;background:#eee9d9;font-family:'Poppins',sans-serif;color:#20201c;}
.pf-nav{background:#fff;border-bottom:1px solid rgba(20,20,20,0.08);padding:14px 24px;display:flex;align-items:center;justify-content:space-between;gap:12px;position:sticky;top:0;z-index:50;}
.pf-brand{display:flex;align-items:center;gap:10px;text-decoration:none;}
.pf-brand .mark{width:28px;height:28px;background:#DCE07A;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#181A4D;font-weight:900;}
.pf-brand .word{font-weight:900;font-size:19px;color:#181A4D;letter-spacing:-0.02em;}
.pf-navlinks{display:flex;gap:22px;}
.pf-navlink{color:#8a8678;font-weight:700;font-size:13px;text-decoration:none;}
.pf-navlink.active{color:#181A4D;}
.pf-signin{background:#181A4D;color:#fff;font-weight:800;font-size:12.5px;padding:9px 18px;border-radius:20px;text-decoration:none;border:none;cursor:pointer;font-family:'Poppins';}
.pf-shell{max-width:820px;margin:0 auto;padding:44px 28px 100px;}

.pf-header{grid-template-columns:minmax(0,1fr) auto;display:grid;align-items:center;gap:22px;margin-bottom:34px;}
.pf-idrow{display:flex;align-items:center;gap:20px;min-width:0;}
.pf-avatar{width:80px;height:80px;border-radius:50%;background:#0F4A42;color:#FBF8ED;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:30px;flex-shrink:0;overflow:hidden;letter-spacing:-0.02em;}
.pf-avatar img{width:100%;height:100%;object-fit:cover;}
.pf-idcol{min-width:0;}
.pf-name{font-size:28px;font-weight:900;color:#181A4D;letter-spacing:-0.03em;margin:0 0 4px;line-height:1.1;overflow:hidden;text-overflow:ellipsis;}
.pf-since{font-size:12.5px;color:#8a8678;font-weight:600;}
.pf-signout{background:transparent;color:#8a8678;border:1.5px solid rgba(20,20,20,0.10);border-radius:20px;padding:9px 18px;font-weight:700;font-size:12.5px;font-family:'Poppins';cursor:pointer;}
.pf-signout:hover{color:#FF340C;border-color:#FF340C;}

.pf-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:44px;}
.pf-stat{background:#fff;border-radius:14px;padding:18px 16px;text-align:center;border:1px solid rgba(20,20,20,0.06);}
.pf-stat .n{font-size:26px;font-weight:900;color:#181A4D;letter-spacing:-0.02em;line-height:1;margin-bottom:6px;}
.pf-stat .l{font-size:10.5px;font-weight:800;color:#8a8678;letter-spacing:0.12em;text-transform:uppercase;line-height:1.3;}

.pf-section{margin-bottom:44px;}
.pf-section h2{font-size:13px;font-weight:800;color:#8a8678;letter-spacing:0.14em;text-transform:uppercase;margin:0 0 6px;}
.pf-section .sh{font-size:13.5px;color:#8a8678;margin:0 0 18px;line-height:1.55;}

.pf-topics{display:flex;flex-wrap:wrap;gap:9px;}
.pf-pill{background:#fff;border:1.5px solid rgba(20,20,20,0.10);border-radius:20px;padding:9px 16px;font-family:'Poppins';font-weight:700;font-size:12.5px;color:#181A4D;cursor:pointer;transition:all .15s ease;display:inline-flex;align-items:center;gap:8px;}
.pf-pill:hover{border-color:#181A4D;}
.pf-pill .dot{width:8px;height:8px;border-radius:50%;background:currentColor;opacity:0.4;}
.pf-pill.on{background:#181A4D;color:#fff;border-color:#181A4D;}
.pf-pill.on .dot{opacity:1;}

.pf-settings{background:#fff;border-radius:16px;border:1px solid rgba(20,20,20,0.06);overflow:hidden;}
.pf-row{padding:18px 22px;display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:18px;border-bottom:1px solid rgba(20,20,20,0.05);}
.pf-row:last-child{border-bottom:none;}
.pf-row .k{font-size:14px;font-weight:700;color:#181A4D;margin-bottom:3px;letter-spacing:-0.005em;}
.pf-row .d{font-size:12.5px;color:#8a8678;font-weight:500;line-height:1.5;}
.pf-toggle{width:44px;height:24px;background:rgba(20,20,20,0.15);border-radius:99px;position:relative;cursor:pointer;transition:background .18s ease;border:none;padding:0;flex-shrink:0;}
.pf-toggle::after{content:"";position:absolute;top:2px;left:2px;width:20px;height:20px;background:#fff;border-radius:50%;transition:left .18s ease;box-shadow:0 2px 6px rgba(0,0,0,0.15);}
.pf-toggle.on{background:#0F4A42;}
.pf-toggle.on::after{left:22px;}
.pf-linkbtn{background:transparent;border:1.5px solid rgba(20,20,20,0.10);border-radius:20px;padding:8px 16px;font-family:'Poppins';font-weight:700;font-size:12px;color:#181A4D;cursor:pointer;}
.pf-linkbtn:hover{border-color:#181A4D;}
.pf-placeholder{font-size:11.5px;color:#8a8678;font-weight:600;font-style:italic;}

.pf-signgate{background:#fff;border:1px solid rgba(20,20,20,0.08);border-left:4px solid #FF340C;border-radius:14px;padding:22px;max-width:520px;}
.pf-signgate h3{font-size:16px;font-weight:800;color:#181A4D;margin:0 0 6px;}
.pf-signgate p{font-size:13.5px;color:#8a8678;margin:0 0 14px;line-height:1.55;}

@media (max-width:640px){
  .pf-stats{grid-template-columns:repeat(2,1fr);}
  .pf-name{font-size:22px;}
}
`;

function useAuth() {
  const [userId, setUserId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setUserId(data.session?.user.id ?? null); setReady(true); });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setUserId(s?.user.id ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);
  return { userId, ready };
}

const formatMonth = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { month: "long", year: "numeric" });

function initials(name?: string | null, email?: string | null) {
  const src = (name && name.trim()) || (email && email.split("@")[0]) || "?";
  return src.split(/\s+/).slice(0, 2).map((s) => s[0]?.toUpperCase() ?? "").join("") || "?";
}

// Local-only settings (persisted in localStorage until backend sync ships)
const LS_KEY = (uid: string) => `cocreate:settings:${uid}`;
type Settings = { notify_new_content: boolean; notify_replies: boolean; profile_public: boolean };
const DEFAULT_SETTINGS: Settings = { notify_new_content: true, notify_replies: true, profile_public: false };

function loadSettings(uid: string): Settings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(LS_KEY(uid));
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch { return DEFAULT_SETTINGS; }
}
function saveSettings(uid: string, s: Settings) {
  try { window.localStorage.setItem(LS_KEY(uid), JSON.stringify(s)); } catch { /* ignore */ }
}

function ProfilePage() {
  const { userId, ready } = useAuth();
  const qc = useQueryClient();
  const [email, setEmail] = useState<string | null>(null);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);

  useEffect(() => {
    document.body.style.background = "#eee9d9";
    return () => { document.body.style.background = ""; };
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
  }, [userId]);

  useEffect(() => { if (userId) setSettings(loadSettings(userId)); }, [userId]);

  const profileQ = useQuery({
    queryKey: ["profile", userId],
    enabled: ready && !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", userId!).maybeSingle();
      if (error) throw error;
      return data as Profile | null;
    },
  });

  const topicsQ = useQuery({
    queryKey: ["topics-all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("topics").select("*").order("name");
      if (error) throw error;
      return (data ?? []) as Topic[];
    },
  });

  const subsQ = useQuery({
    queryKey: ["topic-subs", userId],
    enabled: ready && !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from("topic_subscriptions").select("*").eq("user_id", userId!);
      if (error) throw error;
      return (data ?? []) as Sub[];
    },
  });

  const savedCountQ = useQuery({
    queryKey: ["saved-count", userId],
    enabled: ready && !!userId,
    queryFn: async () => {
      const { count, error } = await supabase.from("saved_items").select("id", { count: "exact", head: true }).eq("user_id", userId!);
      if (error) throw error;
      return count ?? 0;
    },
  });

  const notesCountQ = useQuery({
    queryKey: ["notes-count", userId],
    enabled: ready && !!userId,
    queryFn: async () => {
      const { count, error } = await supabase.from("notes").select("id", { count: "exact", head: true }).eq("user_id", userId!);
      if (error) throw error;
      return count ?? 0;
    },
  });

  const isAdminQ = useQuery({
    queryKey: ["is-admin", userId],
    enabled: ready && !!userId,
    queryFn: async () => {
      const { data } = await supabase.rpc("has_role", { _user_id: userId!, _role: "admin" });
      return !!data;
    },
  });

  const toggleTopic = useMutation({
    mutationFn: async ({ topicId, on }: { topicId: string; on: boolean }) => {
      if (!userId) return;
      if (on) {
        const { error } = await supabase.from("topic_subscriptions").insert({ user_id: userId, topic_id: topicId });
        if (error) throw error;
        trackEvent("topic_subscribed", { topic_id: topicId });
      } else {
        const { error } = await supabase.from("topic_subscriptions").delete().eq("user_id", userId).eq("topic_id", topicId);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["topic-subs", userId] }),
  });

  const updateSetting = (key: keyof Settings, value: boolean) => {
    if (!userId) return;
    const next = { ...settings, [key]: value };
    setSettings(next);
    saveSettings(userId, next);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  if (ready && !userId) {
    return (
      <AppShell current="profile">
        <style dangerouslySetInnerHTML={{ __html: CSS }} />
        <div className="pf-root">
        <div className="pf-shell">
          <div className="pf-signgate">
            <h3>Sign in to see your profile</h3>
            <p>Your streak, saved items, topic subscriptions, and settings live here — private to your account.</p>
            <Link to="/auth" className="pf-signin">Sign in</Link>
          </div>
        </div>
        </div>
      </AppShell>
    );
  }

  const profile = profileQ.data;
  const topics = topicsQ.data ?? [];
  const subs = subsQ.data ?? [];
  const subbedIds = new Set(subs.map((s) => s.topic_id));

  return (
    <AppShell current="profile">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="pf-root">


      <div className="pf-shell">
        <header className="pf-header">
          <div className="pf-idrow">
            <div className="pf-avatar">
              {profile?.avatar_url ? <img src={profile.avatar_url} alt={profile.name ?? ""} /> : initials(profile?.name, email)}
            </div>
            <div className="pf-idcol">
              <h1 className="pf-name">{profile?.name ?? email?.split("@")[0] ?? "Friend"}</h1>
              <div className="pf-since">Member since {profile ? formatMonth(profile.member_since) : "—"}</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <Link to="/friends" style={{ background: "transparent", color: "#181A4D", fontWeight: 700, fontSize: 12.5, padding: "9px 16px", borderRadius: 20, textDecoration: "none", fontFamily: "Poppins", border: "1.5px solid rgba(20,20,20,0.10)" }}>Friends</Link>
            {isAdminQ.data && (
              <Link to="/admin/content" style={{ background: "#181A4D", color: "#fff", fontWeight: 800, fontSize: 12, padding: "9px 16px", borderRadius: 20, textDecoration: "none", fontFamily: "Poppins" }}>Admin</Link>
            )}
            <button className="pf-signout" onClick={signOut}>Sign out</button>
          </div>
        </header>

        <div className="pf-stats">
          <div className="pf-stat"><div className="n">{profile?.streak_count ?? 0}</div><div className="l">Day streak</div></div>
          <div className="pf-stat"><div className="n">{savedCountQ.data ?? 0}</div><div className="l">Saved</div></div>
          <div className="pf-stat"><div className="n">{subs.length}</div><div className="l">Topics</div></div>
          <div className="pf-stat"><div className="n">{notesCountQ.data ?? 0}</div><div className="l">Notes</div></div>
        </div>

        <div className="pf-section">
          <h2>Topics you follow</h2>
          <p className="sh">Choose the conversations you want more of. New content on these will bubble up first on your Home.</p>
          <div className="pf-topics">
            {topics.map((t) => {
              const on = subbedIds.has(t.id);
              return (
                <button
                  key={t.id}
                  className={`pf-pill ${on ? "on" : ""}`}
                  onClick={() => toggleTopic.mutate({ topicId: t.id, on: !on })}
                  disabled={toggleTopic.isPending}
                >
                  <span className="dot" style={{ background: topicColor(t.color_key), opacity: 1 }} />
                  {t.name}
                </button>
              );
            })}
          </div>
        </div>

        <div className="pf-section">
          <h2>Settings</h2>
          <p className="sh">Quiet by default. Change these any time.</p>
          <div className="pf-settings">
            <div className="pf-row">
              <div>
                <div className="k">New content in your topics</div>
                <div className="d">Occasional email when a new essay, teaching, or podcast lands in a topic you follow.</div>
              </div>
              <button
                className={`pf-toggle ${settings.notify_new_content ? "on" : ""}`}
                aria-pressed={settings.notify_new_content}
                onClick={() => updateSetting("notify_new_content", !settings.notify_new_content)}
              />
            </div>

            <div className="pf-row">
              <div>
                <div className="k">Replies to your comments</div>
                <div className="d">Only sent when someone replies to a thread you're part of.</div>
              </div>
              <button
                className={`pf-toggle ${settings.notify_replies ? "on" : ""}`}
                aria-pressed={settings.notify_replies}
                onClick={() => updateSetting("notify_replies", !settings.notify_replies)}
              />
            </div>

            <div className="pf-row">
              <div>
                <div className="k">Profile visibility</div>
                <div className="d">Private by default. When public, others can see your display name next to your comments only — never your notes or saves.</div>
              </div>
              <button
                className={`pf-toggle ${settings.profile_public ? "on" : ""}`}
                aria-pressed={settings.profile_public}
                onClick={() => updateSetting("profile_public", !settings.profile_public)}
              />
            </div>

            <div className="pf-row">
              <div>
                <div className="k">Account & subscription</div>
                <div className="d">Email, password, and any future paid tier will live here.</div>
              </div>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <span className="pf-placeholder">Coming soon</span>
                <button className="pf-linkbtn" disabled style={{ opacity: 0.5, cursor: "not-allowed" }}>Manage</button>
              </div>
            </div>

            <div className="pf-row">
              <div>
                <div className="k">Connected devices</div>
                <div className="d">See where you're signed in and sign out remotely.</div>
              </div>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <span className="pf-placeholder">Coming soon</span>
                <button className="pf-linkbtn" disabled style={{ opacity: 0.5, cursor: "not-allowed" }}>Review</button>
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>
    </AppShell>
  );
}

