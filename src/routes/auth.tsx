import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { signInWithGoogle, isNativeApp } from "@/lib/native-auth";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
  head: () => ({
    meta: [
      { title: "Sign in — CoCreate" },
      { name: "description", content: "Sign in or create your CoCreate account to save essays, take notes, and journal devotionals." },
    ],
  }),
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/" });
    });
  }, [navigate]);

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); setNotice(null); setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { name },
          },
        });
        if (error) throw error;
        setNotice("Check your email to confirm your account, then sign in.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/" });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError(null); setLoading(true);
    const result = await signInWithGoogle();
    if (result.error) {
      setError(result.error.message || "Google sign-in failed");
      setLoading(false);
      return;
    }
    if (!result.pending) {
      navigate({ to: "/" });
      return;
    }
    // Native / redirect flow continues outside this page.
    if (isNativeApp()) setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#eee9d9", fontFamily: "Poppins, sans-serif", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 420, background: "#fff", border: "1px solid rgba(20,20,20,0.08)", borderRadius: 20, padding: 32, boxShadow: "0 30px 60px rgba(0,0,0,0.10)" }}>
        <Link to="/" style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 22, textDecoration: "none" }}>
          <div style={{ width: 32, height: 32, background: "#DCE07A", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "#181A4D", fontWeight: 900 }}>C</div>
          <div style={{ fontWeight: 900, fontSize: 20, color: "#181A4D", letterSpacing: "-0.02em" }}>CoCreate</div>
        </Link>

        <h1 style={{ fontSize: 24, fontWeight: 900, color: "#181A4D", marginBottom: 6, letterSpacing: "-0.02em" }}>
          {mode === "signin" ? "Welcome back" : "Create your account"}
        </h1>
        <p style={{ fontSize: 13, color: "#8a8678", marginBottom: 22 }}>
          {mode === "signin" ? "Sign in to save essays, take notes, and journal devotionals." : "Join CoCreate to save what moves you and return to it."}
        </p>

        <button onClick={handleGoogle} disabled={loading}
          style={{ width: "100%", padding: "11px 14px", borderRadius: 10, border: "1.5px solid rgba(20,20,20,0.12)", background: "#fff", color: "#20201c", fontWeight: 700, fontSize: 13, fontFamily: "Poppins", cursor: loading ? "wait" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 16 }}>
          <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.5l6.8-6.8C35.6 2.4 30.1 0 24 0 14.6 0 6.4 5.4 2.5 13.3l7.9 6.1C12.3 13.3 17.6 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.6-4.9 7.3l7.6 5.9c4.4-4.1 7.1-10.1 7.1-17.7z"/><path fill="#FBBC05" d="M10.4 28.6c-.5-1.4-.8-2.9-.8-4.6s.3-3.2.8-4.6l-7.9-6.1C.9 16.5 0 20.1 0 24s.9 7.5 2.5 10.7l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.1 0 11.3-2 15-5.5l-7.6-5.9c-2.1 1.4-4.7 2.2-7.4 2.2-6.4 0-11.7-3.8-13.6-9.4l-7.9 6.1C6.4 42.6 14.6 48 24 48z"/></svg>
          Continue with Google
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "14px 0", color: "#8a8678", fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>
          <div style={{ flex: 1, height: 1, background: "rgba(20,20,20,0.08)" }} /> or <div style={{ flex: 1, height: 1, background: "rgba(20,20,20,0.08)" }} />
        </div>

        <form onSubmit={handleEmail} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {mode === "signup" && (
            <input type="text" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)}
              style={inputStyle} required />
          )}
          <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)}
            style={inputStyle} required autoComplete="email" />
          <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)}
            style={inputStyle} required minLength={6} autoComplete={mode === "signup" ? "new-password" : "current-password"} />

          {error && <div style={{ fontSize: 12, color: "#FF340C", fontWeight: 600 }}>{error}</div>}
          {notice && <div style={{ fontSize: 12, color: "#0F4A42", fontWeight: 600 }}>{notice}</div>}

          <button type="submit" disabled={loading}
            style={{ padding: "12px 14px", borderRadius: 10, border: "none", background: "#181A4D", color: "#fff", fontWeight: 800, fontSize: 13, fontFamily: "Poppins", cursor: loading ? "wait" : "pointer", letterSpacing: "0.02em" }}>
            {loading ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>

        <div style={{ marginTop: 18, fontSize: 12.5, color: "#8a8678", textAlign: "center" }}>
          {mode === "signin" ? "New to CoCreate?" : "Already have an account?"}{" "}
          <button onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(null); setNotice(null); }}
            style={{ background: "none", border: "none", color: "#181A4D", fontWeight: 800, cursor: "pointer", fontFamily: "Poppins", fontSize: 12.5 }}>
            {mode === "signin" ? "Create an account" : "Sign in"}
          </button>
        </div>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "11px 14px",
  borderRadius: 10,
  border: "1.5px solid rgba(20,20,20,0.12)",
  background: "#FBF8ED",
  fontFamily: "Poppins",
  fontSize: 13,
  color: "#20201c",
  outline: "none",
};
