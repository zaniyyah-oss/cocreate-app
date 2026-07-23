import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/tour")({
  component: TourPage,
  head: () => ({
    meta: [
      { title: "Tour the Workspace — CoCreate" },
      { name: "description", content: "A guided tour of the CoCreate Workspace — Read, Pray, To-Do, Notes and Calendar all in one quiet place." },
      { property: "og:title", content: "Tour the Workspace — CoCreate" },
      { property: "og:description", content: "See how the CoCreate Workspace helps you read, pray, and plan your day." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

const CSS = `
.tour{font-family:'Poppins',sans-serif;background:#eee9d9;color:#20201C;min-height:100vh;}
.tour .wrap{max-width:1200px;margin:0 auto;padding:32px 24px 80px;}
.tour-hero{background:#181A4D;color:#fff;border-radius:18px;padding:36px 28px;margin-bottom:28px;display:flex;flex-direction:column;gap:14px;}
@media(min-width:900px){.tour-hero{padding:48px 40px;}}
.tour-eyebrow{font-size:12px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#DCE07A;}
.tour-hero h1{font-size:28px;font-weight:900;margin:0;line-height:1.15;letter-spacing:-0.01em;}
@media(min-width:900px){.tour-hero h1{font-size:40px;}}
.tour-hero p{font-size:15px;color:rgba(255,255,255,0.78);margin:0;max-width:680px;line-height:1.55;}
.tour-hero .actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:8px;}
.tour-btn{display:inline-flex;align-items:center;gap:8px;background:#DCE07A;color:#181A4D;font-weight:800;font-size:13px;padding:11px 18px;border-radius:999px;border:none;cursor:pointer;font-family:inherit;text-decoration:none;}
.tour-btn.secondary{background:transparent;color:#fff;border:1.5px dashed rgba(255,255,255,0.4);}
.tour-back{display:inline-flex;align-items:center;gap:6px;background:transparent;color:rgba(255,255,255,0.85);font-size:13px;font-weight:700;border:1px solid rgba(255,255,255,0.28);border-radius:999px;padding:8px 14px;text-decoration:none;transition:all .15s ease;}
.tour-back:hover{color:#fff;border-color:#DCE07A;background:rgba(255,255,255,0.06);}
.tour-section{background:#fff;border-radius:16px;padding:24px;box-shadow:0 12px 40px rgba(24,26,77,0.06);}
.tour-section h2{font-size:18px;font-weight:800;color:#181A4D;margin:0 0 12px;}
.tour-section p{font-size:14px;line-height:1.6;color:#4a4538;margin:0 0 16px;}
.tour-section ul{margin:0 0 0 18px;padding:0;}
.tour-section li{font-size:14px;line-height:1.6;color:#4a4538;margin-bottom:6px;}
.tour-section strong{color:#181A4D;}
.tour-mock{background:#fff;border-radius:16px;padding:22px;box-shadow:0 12px 40px rgba(24,26,77,0.08);}
.tour-mock h2{font-size:16px;font-weight:800;color:#181A4D;margin:0 0 4px;}
.tour-mock .date{font-size:12px;color:#9a9484;font-weight:600;margin-bottom:16px;}
.tour-grid{display:grid;grid-template-columns:1fr;gap:14px;}
@media(min-width:900px){.tour-grid{grid-template-columns:repeat(3,1fr);}}
.tour-tile{border-radius:14px;padding:18px;min-height:220px;display:flex;flex-direction:column;gap:8px;}
.tour-tile.read{background:#FFF1CF;}
.tour-tile.pray{background:#D6EED2;color:#0F4A42;}
.tour-tile.todo{background:#E8E4FF;}
.tour-tile .lbl{font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#181A4D;}
.tour-tile.pray .lbl{color:#0F4A42;}
.tour-tile p{font-size:13.5px;line-height:1.55;color:#20201C;margin:0;}

/* Modal */
.tour-modal-back{position:fixed;inset:0;background:rgba(24,26,77,0.68);z-index:100;display:flex;align-items:center;justify-content:center;padding:20px;animation:tf .18s ease-out;}
@keyframes tf{from{opacity:0;}to{opacity:1;}}
.tour-modal{background:#fff;border-radius:16px;max-width:820px;width:100%;overflow:hidden;box-shadow:0 24px 80px rgba(0,0,0,0.35);}
.tour-modal-head{display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid rgba(24,26,77,0.08);}
.tour-modal-head h3{font-size:15px;font-weight:800;color:#181A4D;margin:0;}
.tour-modal-close{background:transparent;border:none;font-size:22px;color:#8a8678;cursor:pointer;line-height:1;padding:4px 8px;font-family:inherit;}
.tour-modal-body{background:#000;aspect-ratio:16/9;display:flex;align-items:center;justify-content:center;color:#fff;position:relative;}
.tour-modal-body iframe{width:100%;height:100%;border:0;}
.tour-modal-foot{padding:16px 20px;font-size:13px;color:#6b6656;line-height:1.55;}
`;

function TourPage() {
  const [open, setOpen] = useState(true);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <AppShell current="devotionals" hideSideWhenSignedOut>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="tour">
        <div className="wrap">
          <Link to="/" className="tour-back">← Back home</Link>

          <div className="tour-hero">
            <div className="tour-eyebrow">Guided tour</div>
            <h1>The Workspace, in about two minutes.</h1>
            <p>
              A quiet place to read, pray, and plan your day. Watch the short video for a walk-through,
              or explore the mockup below. When you're ready, jump in and try it yourself.
            </p>
            <div className="actions">
              <button className="tour-btn" onClick={() => setOpen(true)}>▶ Watch the walkthrough</button>
              <Link to="/devotionals" className="tour-btn secondary">Open the Workspace →</Link>
            </div>
          </div>

          <div className="tour-mock">
            <h2>Today's Workspace</h2>
            <div className="date">A quiet Tuesday morning</div>
            <div className="tour-grid">
              <div className="tour-tile read">
                <span className="lbl">Read</span>
                <p><strong>Psalm 23</strong> — The LORD is my shepherd, I lack nothing. He makes me lie down in green pastures, he leads me beside quiet waters, he refreshes my soul…</p>
              </div>
              <div className="tour-tile pray">
                <span className="lbl">Pray</span>
                <p>Sit here for a moment. Type freely — what surfaced as you read? What are you carrying today?</p>
              </div>
              <div className="tour-tile todo">
                <span className="lbl">To-Do</span>
                <p>• Call mom<br/>• 20-min walk after lunch<br/>• Send Sarah the passage from this morning</p>
              </div>
            </div>
          </div>

          <div className="tour-section" style={{ marginTop: "24px" }}>
            <h2>What is the Workspace?</h2>
            <p>
              The workspace is the heart of CoCreate — a single page where your daily devotional, prayer,
              notes, and to-do list live together. Rather than jumping between apps, everything you need
              for your time with God is in one calm, focused place.
            </p>
            <ul>
              <li><strong>Read:</strong> a Scripture or devotional reading for the day, with context and next steps.</li>
              <li><strong>Pray:</strong> a private space to type out prayers, reflections, and anything the reading brought up.</li>
              <li><strong>To-Do:</strong> capture what you want to carry into the day — actions, reminders, or people to reach out to.</li>
              <li><strong>Notes & Calendar:</strong> your saved thoughts and upcoming events, all tied to the same day.</li>
            </ul>
          </div>
        </div>

        {open && (
          <div className="tour-modal-back" onClick={() => setOpen(false)}>
            <div className="tour-modal" onClick={(e) => e.stopPropagation()}>
              <div className="tour-modal-head">
                <h3>How the Workspace works</h3>
                <button className="tour-modal-close" onClick={() => setOpen(false)} aria-label="Close">×</button>
              </div>
              <div className="tour-modal-body">
                <iframe
                  src="https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1&rel=0"
                  title="CoCreate Workspace walkthrough"
                  allow="autoplay; encrypted-media; picture-in-picture"
                  allowFullScreen
                />
              </div>
              <div className="tour-modal-foot">
                A ~2 minute tour of Read, Pray, and To-Do — plus how notes, tags, and the calendar tie it all together.
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
