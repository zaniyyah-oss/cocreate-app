import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/privacy")({
  component: PrivacyPage,
  head: () => ({
    meta: [
      { title: "Privacy Policy — CoCreate" },
      {
        name: "description",
        content:
          "How CoCreate collects, uses, and protects your data — account information, devotional content, notes, and calendar events.",
      },
      { property: "og:title", content: "Privacy Policy — CoCreate" },
      {
        property: "og:description",
        content:
          "How CoCreate collects, uses, and protects your data — account information, devotional content, notes, and calendar events.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Privacy Policy — CoCreate" },
      {
        name: "twitter:description",
        content:
          "How CoCreate collects, uses, and protects your data — account information, devotional content, notes, and calendar events.",
      },
    ],
  }),
});

const CSS = `
.priv{font-family:'Poppins',sans-serif;background:#eee9d9;color:#20201C;min-height:100vh;}
.priv .wrap{max-width:820px;margin:0 auto;padding:40px 24px 96px;}
.priv-top{display:flex;align-items:center;gap:10px;margin-bottom:32px;}
.priv-back{display:inline-flex;align-items:center;gap:8px;background:#181A4D;color:#fff;font-size:13px;font-weight:700;border-radius:999px;padding:9px 16px;text-decoration:none;}
.priv-back:hover{background:#23266a;}
.priv-back svg{width:15px;height:15px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;}
.priv-card{background:#fff;border-radius:18px;padding:34px 28px;box-shadow:0 12px 40px rgba(24,26,77,0.06);}
@media(min-width:680px){.priv-card{padding:48px 44px;}}
.priv-eyebrow{font-size:11.5px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#9a9484;}
.priv h1{font-size:30px;font-weight:900;color:#181A4D;margin:8px 0 6px;line-height:1.15;letter-spacing:-0.01em;}
@media(min-width:680px){.priv h1{font-size:38px;}}
.priv .updated{font-size:12.5px;color:#9a9484;font-weight:600;margin-bottom:28px;}
.priv h2{font-size:18px;font-weight:800;color:#181A4D;margin:30px 0 10px;}
.priv p{font-size:14.5px;line-height:1.7;color:#4a4538;margin:0 0 14px;}
.priv ul{margin:0 0 16px 0;padding-left:20px;}
.priv li{font-size:14.5px;line-height:1.7;color:#4a4538;margin-bottom:8px;}
.priv strong{color:#181A4D;}
.priv a.inline{color:#181A4D;font-weight:700;text-decoration:underline;text-underline-offset:2px;}
.priv hr{border:none;border-top:1px solid rgba(20,20,20,0.08);margin:28px 0;}
.priv-contact{background:#FBF8ED;border-radius:14px;padding:22px;margin-top:8px;}
.priv-contact p{margin-bottom:8px;}
.priv-contact a{color:#181A4D;font-weight:700;text-decoration:none;}
`;

function PrivacyPage() {
  return (
    <AppShell navKey="home">
      <style>{CSS}</style>
      <div className="priv">
        <div className="wrap">
          <div className="priv-top">
            <Link to="/" className="priv-back">
              <svg viewBox="0 0 24 24">
                <path d="M15 18l-6-6 6-6" />
              </svg>
              Back home
            </Link>
          </div>

          <div className="priv-card">
            <div className="priv-eyebrow">Legal</div>
            <h1>Privacy Policy</h1>
            <div className="updated">Last updated: August 21, 2026</div>

            <p>
              CoCreate is a Christian devotional and spiritual-growth tool. We
              take your privacy seriously and only collect what we need to
              provide the app. This policy explains what data we collect, how we
              use it, and the choices you have.
            </p>

            <h2>1. Information we collect</h2>
            <p>
              <strong>Account information.</strong> When you create an account
              we store your email address and the display name you provide. If
              you sign in with Google, we receive the email and profile
              information Google shares with us.
            </p>
            <p>
              <strong>Devotional content.</strong> The notes, prayers, to-do
              items, devotional progress, and calendar events you create inside
              the app are stored so you can revisit and continue your study.
            </p>
            <p>
              <strong>Connection data.</strong> If you use Friends, Discipler, or
              Group features, we store the relationships and messages you
              exchange with other users.
            </p>
            <p>
              <strong>Usage data.</strong> We collect basic, anonymous analytics
              (such as which features are used) to improve the app. We do not sell
              this data.
            </p>

            <h2>2. How we use your information</h2>
            <ul>
              <li>To provide and personalize the devotional workspace, notes, and calendar.</li>
              <li>To remember your reading, prayer, and plan progress across devices.</li>
              <li>To enable connection and messaging features with people you choose to connect with.</li>
              <li>To send you service-related emails (such as password reset).</li>
              <li>To improve the app and fix issues.</li>
            </ul>

            <h2>3. Third-party services</h2>
            <p>
              We use trusted providers to run the app. Each has its own privacy
              practices:
            </p>
            <ul>
              <li>
                <strong>Supabase</strong> — authentication and database hosting for
                your account and devotional content.
              </li>
              <li>
                <strong>Google</strong> — optional sign-in. We only receive your
                email and basic profile; we do not access your Google account
                beyond that.
              </li>
            </ul>
            <p>
              We never sell your personal data to anyone.
            </p>

            <h2>4. Data retention</h2>
            <p>
              We keep your data for as long as your account is active. You can
              request deletion of your account and associated data at any time
              (see below). When your account is deleted, we remove your personal
              information from our active systems within a reasonable period.
            </p>

            <h2>5. Your choices</h2>
            <ul>
              <li>You can edit your profile or sign out at any time.</li>
              <li>You can disconnect or remove connections and messages.</li>
              <li>You can request a copy of your data or ask us to delete it.</li>
              <li>You can stop using Google sign-in and switch to email sign-in.</li>
            </ul>

            <h2>6. Children's privacy</h2>
            <p>
              CoCreate is intended for general use. We do not knowingly collect
              personal information from children under 13. If you believe a child
              has provided us information, please contact us and we will remove it.
            </p>

            <h2>7. Security</h2>
            <p>
              We use industry-standard measures to protect your data, including
              encrypted connections (HTTPS) and role-based access controls.
              However, no system is perfectly secure, and we cannot guarantee
              absolute protection.
            </p>

            <h2>8. Changes to this policy</h2>
            <p>
              We may update this policy as the app evolves. When we do, we'll
              revise the "Last updated" date above. Material changes will be
              highlighted in the app or by email where possible.
            </p>

            <hr />

            <div className="priv-contact">
              <p>
                <strong>Questions or deletion requests?</strong>
              </p>
              <p>
                Email us at{" "}
                <a href="mailto:support@justcocreate.com">support@justcocreate.com</a>{" "}
                and we'll get back to you as soon as we can.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
