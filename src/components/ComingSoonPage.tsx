import { Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";

export function ComingSoonPage({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <AppShell current="explore" hideSideWhenSignedOut>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "64px 24px 120px", fontFamily: "'Poppins',sans-serif" }}>
        <div style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: ".14em", textTransform: "uppercase", color: "#8a8678", marginBottom: 10 }}>{eyebrow}</div>
        <h1 style={{ fontFamily: "'Archivo Black','Poppins',sans-serif", fontSize: 40, color: "#181A4D", margin: "0 0 12px" }}>{title}</h1>
        <p style={{ fontSize: 16, color: "#6f6b5e", margin: "0 0 28px" }}>Coming soon.</p>
        <Link to="/" search={{ feed: 1 } as any} style={{ fontSize: 13, fontWeight: 700, color: "#0F4A42" }}>← Back to Explore</Link>
      </div>
    </AppShell>
  );
}
