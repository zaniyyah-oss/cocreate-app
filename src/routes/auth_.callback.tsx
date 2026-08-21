import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { APP_URL_SCHEME } from "@/lib/native-auth";

export const Route = createFileRoute("/auth_/callback")({
  component: AuthCallback,
  head: () => ({
    meta: [
      { title: "Signing you in — CoCreate" },
      { name: "description", content: "Completing your CoCreate sign-in." },
    ],
  }),
});

/** Tokens can arrive in the query string or the hash fragment. */
function readTokens() {
  const search = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const get = (key: string) => search.get(key) ?? hash.get(key);
  return {
    access_token: get("access_token"),
    refresh_token: get("refresh_token"),
    error: get("error_description") ?? get("error"),
    isNativeHandoff: search.get("native") === "1",
  };
}

function AuthCallback() {
  const navigate = useNavigate();
  const [message, setMessage] = useState("Finishing sign-in…");

  useEffect(() => {
    const run = async () => {
      const { access_token, refresh_token, error, isNativeHandoff } = readTokens();

      // Opened in the system browser by the native app: hand the result back to
      // the app through its URL scheme instead of signing in here.
      if (isNativeHandoff) {
        const payload = window.location.search.replace(/^\?/, "");
        const frag = window.location.hash.replace(/^#/, "");
        const query = [payload, frag].filter(Boolean).join("&");
        setMessage("Returning to CoCreate…");
        window.location.replace(`${APP_URL_SCHEME}://auth/callback?${query}`);
        return;
      }

      if (error) {
        setMessage(error);
        return;
      }

      if (access_token && refresh_token) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token,
          refresh_token,
        });
        if (sessionError) {
          setMessage(sessionError.message);
          return;
        }
      }

      const { data } = await supabase.auth.getSession();
      navigate({ to: data.session ? "/" : "/auth", replace: true });
    };
    void run();
  }, [navigate]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#eee9d9",
        fontFamily: "Poppins, sans-serif",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        color: "#181A4D",
        fontWeight: 700,
        fontSize: 14,
        textAlign: "center",
      }}
    >
      {message}
    </div>
  );
}
