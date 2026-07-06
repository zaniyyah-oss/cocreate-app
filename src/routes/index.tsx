import { createFileRoute } from "@tanstack/react-router";
import photoCard from "@/assets/photo-card.jpg";

export const Route = createFileRoute("/")({
  component: StyleGuide,
});

type Swatch = { name: string; varName: string; hex: string; dark?: boolean };

const swatches: Swatch[] = [
  { name: "Navy", varName: "--navy", hex: "#181A4D", dark: true },
  { name: "Fire", varName: "--fire", hex: "#FF340C", dark: true },
  { name: "Periwinkle", varName: "--periwinkle", hex: "#8A96E0" },
  { name: "Lime", varName: "--lime", hex: "#CAC307" },
  { name: "Light Green", varName: "--light-green", hex: "#DCE07A" },
  { name: "Amber", varName: "--amber", hex: "#FFAE00" },
  { name: "Teal", varName: "--teal", hex: "#0F4A42", dark: true },
  { name: "Burgundy", varName: "--burgundy", hex: "#441B07", dark: true },
  { name: "Blush", varName: "--blush", hex: "#E990A2" },
  { name: "Cream", varName: "--cream", hex: "#FBF8ED" },
  { name: "Ink", varName: "--ink", hex: "#20201C", dark: true },
  { name: "Muted", varName: "--muted-brand", hex: "#8A8678", dark: true },
];

const typeScale = [
  { label: "Display / 900", cls: "text-6xl font-black tracking-tight", sample: "Renewed, not rushed." },
  { label: "H1 / 800", cls: "text-4xl font-extrabold tracking-tight", sample: "Identity in Christ" },
  { label: "H2 / 700", cls: "text-3xl font-bold", sample: "Abiding through the week" },
  { label: "H3 / 600", cls: "text-2xl font-semibold", sample: "Continuing where you left off" },
  { label: "Body / 400", cls: "text-base font-normal leading-relaxed", sample: "A reminder rooted in Isaiah 40 for wherever today finds you." },
  { label: "Caption / 500", cls: "text-xs font-medium uppercase tracking-[0.14em]", sample: "Pinned from your notes" },
];

function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`font-black tracking-tight ${className}`} style={{ fontWeight: 900 }}>
      <span style={{ color: "var(--fire)" }}>C</span>
      <span>o</span>
      <span style={{ color: "var(--fire)" }}>C</span>
      <span>reate</span>
    </span>
  );
}

const tagVariants = [
  { label: "Teaching", bg: "var(--amber)", fg: "var(--ink)" },
  { label: "Essay", bg: "var(--light-green)", fg: "var(--ink)" },
  { label: "Podcast", bg: "var(--teal)", fg: "var(--cream)" },
  { label: "Devotional", bg: "var(--lime)", fg: "var(--ink)" },
];

function Tag({ label, bg, fg }: { label: string; bg: string; fg: string }) {
  return (
    <span
      className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider"
      style={{ backgroundColor: bg, color: fg }}
    >
      {label}
    </span>
  );
}

function Section({ title, kicker, children }: { title: string; kicker: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-border py-14">
      <div className="mb-8 flex items-baseline gap-4">
        <span
          className="inline-block h-2 w-2 rounded-full"
          style={{ backgroundColor: "var(--fire)" }}
          aria-hidden
        />
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{kicker}</p>
        <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function StyleGuide() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-6xl px-6 py-14 md:px-10 md:py-20">
        {/* Header */}
        <header className="mb-16 flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-6 flex items-center gap-3">
              <Wordmark className="text-2xl" />
              <span
                className="rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
                style={{ borderColor: "var(--ink)", color: "var(--ink)" }}
              >
                Style Guide
              </span>
            </div>
            <h1 className="max-w-2xl text-5xl font-black leading-[1.02] tracking-tight md:text-6xl">
              The visual foundation for{" "}
              <span style={{ color: "var(--fire)" }}>a warmer</span>{" "}
              conversation.
            </h1>
            <p className="mt-5 max-w-xl text-base text-muted-foreground">
              Bright, warm, inviting. Cream and white carry the room — color arrives in
              small, deliberate pops: a tag, an icon, an accent border, a tinted overlay.
            </p>
          </div>
        </header>

        {/* Wordmark */}
        <Section kicker="01" title="Wordmark">
          <div
            className="flex items-center justify-center rounded-2xl border py-16"
            style={{ backgroundColor: "#fff" }}
          >
            <Wordmark className="text-6xl md:text-8xl" />
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Always Poppins 900. Both C&apos;s capitalized. No period. Never set in a script or cursive face.
          </p>
        </Section>

        {/* Colors */}
        <Section kicker="02" title="Color">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {swatches.map((s) => (
              <div
                key={s.name}
                className="overflow-hidden rounded-xl border"
                style={{ backgroundColor: "#fff" }}
              >
                <div className="h-24" style={{ backgroundColor: s.hex }} />
                <div className="flex items-baseline justify-between px-4 py-3">
                  <span className="text-sm font-semibold">{s.name}</span>
                  <span className="font-mono text-xs text-muted-foreground">{s.hex}</span>
                </div>
                <div className="px-4 pb-3 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  var({s.varName})
                </div>
              </div>
            ))}
          </div>
          <p className="mt-6 max-w-2xl text-sm text-muted-foreground">
            Base surface: cream <span className="font-mono">#FBF8ED</span> or white.
            Everything else is an accent — a tag, an icon background, a left-border rule,
            a tinted photo overlay. Never a large solid color panel.
          </p>
        </Section>

        {/* Typography */}
        <Section kicker="03" title="Type scale">
          <div className="space-y-6 rounded-2xl border bg-white p-8">
            {typeScale.map((t) => (
              <div key={t.label} className="grid gap-2 md:grid-cols-[160px_1fr] md:items-baseline">
                <div className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                  {t.label}
                </div>
                <div className={t.cls}>{t.sample}</div>
              </div>
            ))}
          </div>
        </Section>

        {/* Buttons */}
        <Section kicker="04" title="Buttons">
          <div className="flex flex-wrap items-center gap-4 rounded-2xl border bg-white p-8">
            <button
              className="rounded-full px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-110 active:translate-y-px"
              style={{ backgroundColor: "var(--navy)" }}
            >
              Continue reading
            </button>
            <button
              className="rounded-full px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-110 active:translate-y-px"
              style={{ backgroundColor: "var(--fire)" }}
            >
              Start today
            </button>
            <button
              className="rounded-full border-2 px-5 py-2.5 text-sm font-semibold transition hover:bg-ink hover:text-cream"
              style={{ borderColor: "var(--ink)", color: "var(--ink)" }}
            >
              Explore topics
            </button>
            <button
              className="rounded-full px-5 py-2.5 text-sm font-semibold transition hover:bg-black/5"
              style={{ color: "var(--ink)" }}
            >
              Skip for now
            </button>
            <button
              disabled
              className="cursor-not-allowed rounded-full border px-5 py-2.5 text-sm font-semibold opacity-40"
              style={{ borderColor: "var(--ink)", color: "var(--ink)" }}
            >
              Disabled
            </button>
          </div>
        </Section>

        {/* Content-type tags */}
        <Section kicker="05" title="Content-type tags">
          <div className="rounded-2xl border bg-white p-8">
            <div className="flex flex-wrap gap-3">
              {tagVariants.map((t) => (
                <Tag key={t.label} {...t} />
              ))}
            </div>
            <p className="mt-6 text-sm text-muted-foreground">
              One tag per piece. The color signals the format — amber for teaching,
              light green for essay, teal for podcast, lime for devotional.
            </p>
          </div>
        </Section>

        {/* Photo card */}
        <Section kicker="06" title="Photo card with tinted overlay">
          <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_320px] md:items-start">
            <article
              className="overflow-hidden rounded-2xl border bg-white"
              style={{ borderLeft: "4px solid var(--amber)" }}
            >
              <div className="relative">
                <img
                  src={photoCard}
                  alt="Open book on linen in warm morning light"
                  width={1024}
                  height={768}
                  loading="lazy"
                  className="h-64 w-full object-cover md:h-80"
                />
                <div
                  className="pointer-events-none absolute inset-0 mix-blend-multiply"
                  style={{ backgroundColor: "var(--amber)", opacity: 0.35 }}
                  aria-hidden
                />
                <div className="absolute left-4 top-4">
                  <Tag label="Teaching" bg="var(--amber)" fg="var(--ink)" />
                </div>
              </div>
              <div className="p-6">
                <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                  Identity in Christ · 8 min read
                </p>
                <h3 className="mt-2 text-2xl font-bold leading-snug tracking-tight">
                  Obedience before certainty — that&apos;s the whole essay, really.
                </h3>
                <p className="mt-3 text-sm text-muted-foreground">
                  A reminder rooted in Isaiah 40 for wherever today finds you.
                </p>
              </div>
            </article>

            <aside className="rounded-2xl border bg-white p-6 text-sm text-muted-foreground">
              <p className="font-semibold text-foreground">Photo &amp; color note</p>
              <p className="mt-3">
                Each thumbnail carries a single tinted pop of color keyed to its content
                type. One accent per image — never a wash of every color at once.
              </p>
              <ul className="mt-4 space-y-2">
                <li className="flex items-center gap-3">
                  <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: "var(--amber)" }} />
                  Teaching — amber
                </li>
                <li className="flex items-center gap-3">
                  <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: "var(--blush)" }} />
                  Essay — pink / light-green
                </li>
                <li className="flex items-center gap-3">
                  <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: "var(--teal)" }} />
                  Podcast — teal
                </li>
                <li className="flex items-center gap-3">
                  <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: "var(--lime)" }} />
                  Devotional — lime
                </li>
              </ul>
            </aside>
          </div>
        </Section>

        <footer className="mt-16 flex items-center justify-between border-t border-border pt-8 text-xs text-muted-foreground">
          <Wordmark className="text-sm" />
          <span>v0.1 — visual foundation</span>
        </footer>
      </div>
    </main>
  );
}
