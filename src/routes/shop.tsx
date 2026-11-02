import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { SiteFooter } from "@/components/SiteFooter";
import { HomeMasthead, HOME_CSS } from "@/routes/index";
import { useUpNext } from "@/lib/up-next";

export const Route = createFileRoute("/shop")({
  component: ShopPage,
  head: () => ({
    meta: [
      { title: "Shop — Abide planners from CoCreate" },
      { name: "description", content: "Abide, in whatever medium today calls for: the GoodNotes planner, a paper planner on the way, and the CoCreate workspace." },
      { property: "og:title", content: "Shop — Abide from CoCreate" },
      { property: "og:description", content: "Paper days, iPad days, phone days: same rhythm, same boxes." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

type Product = { slug: string; title: string; subtitle: string | null; price_label: string | null; checkout_url: string | null; cover_image_url: string | null };

const SEASONS = [
  { value: "fall_winter", label: "Fall/Winter" },
  { value: "spring", label: "Spring" },
  { value: "summer", label: "Summer" },
];

const CSS = `
.sh{max-width:1080px;margin:0 auto;padding:40px 24px 96px;font-family:'Poppins',sans-serif;color:#181A4D;}
.sh-eyebrow{font-size:11.5px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:#8a8678;margin-bottom:10px;}
.sh h1{font-family:'Archivo Black','Poppins',sans-serif;font-weight:900;letter-spacing:-.02em;font-size:44px;margin:0 0 8px;}
.sh-sub{font-size:15px;color:#6f6b5e;margin:0 0 32px;max-width:620px;line-height:1.55;}
.sh-feat{display:grid;grid-template-columns:1fr 1fr;background:#fff;border:1px solid rgba(24,26,77,.08);border-radius:20px;overflow:hidden;}
.sh-cover{background:#441B07;min-height:360px;display:flex;align-items:center;justify-content:center;padding:32px;}
.sh-cover-ph{width:62%;aspect-ratio:3/4;border-radius:10px;border:1.5px solid rgba(255,255,255,.25);display:flex;align-items:flex-end;padding:18px;color:#F4E9D8;font-family:'Archivo Black','Poppins',sans-serif;font-size:18px;background:rgba(255,255,255,.05);}
.sh-cover img{width:62%;border-radius:10px;}
.sh-info{padding:32px;display:flex;flex-direction:column;gap:12px;}
.sh-pill{align-self:flex-start;background:#CAC307;color:#181A4D;font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;padding:5px 12px;border-radius:999px;}
.sh-info h2{font-family:'Archivo Black','Poppins',sans-serif;font-size:28px;margin:0;}
.sh-meta{font-size:14px;color:#6f6b5e;margin:0;}
.sh-price{font-size:22px;font-weight:800;}
.sh-checks{list-style:none;margin:4px 0;padding:0;display:flex;flex-direction:column;gap:8px;font-size:14px;}
.sh-checks li{display:flex;gap:10px;align-items:flex-start;}
.sh-checks li:before{content:"✓";color:#0F4A42;font-weight:900;}
.sh-btns{display:flex;gap:10px;flex-wrap:wrap;margin-top:6px;}
.sh-btn{display:inline-flex;align-items:center;justify-content:center;border-radius:999px;padding:12px 24px;font-weight:800;font-size:13.5px;text-decoration:none;font-family:inherit;cursor:pointer;border:1.5px solid #181A4D;}
.sh-btn.navy{background:#181A4D;color:#fff;}
.sh-btn.navy.soon{opacity:.55;}
.sh-btn.outline{background:transparent;color:#181A4D;}
.sh-small{font-size:12px;color:#8a8678;}
.sh h3.sec{font-family:'Archivo Black','Poppins',sans-serif;font-size:24px;margin:56px 0 16px;}
.sh-ways{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;}
.sh-way{background:#fff;border:1px solid rgba(24,26,77,.08);border-radius:16px;padding:22px;display:flex;flex-direction:column;gap:8px;}
.sh-way.dashed{background:transparent;border:1.5px dashed rgba(24,26,77,.3);}
.sh-way .k{font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#8a8678;}
.sh-way h4{margin:0;font-size:17px;}
.sh-way p{margin:0;font-size:13.5px;color:#6f6b5e;flex:1;}
.sh-way a,.sh-way button{font-weight:800;font-size:13px;color:#0F4A42;text-decoration:none;background:none;border:none;padding:0;cursor:pointer;font-family:inherit;text-align:left;}
.sh-crew{margin-top:56px;background:#181A4D;color:#fff;border-radius:20px;padding:40px;}
.sh-crew .k{font-size:11.5px;font-weight:800;letter-spacing:.14em;color:#CAC307;}
.sh-crew h3{font-family:'Archivo Black','Poppins',sans-serif;font-size:30px;margin:10px 0 8px;}
.sh-crew p{margin:0 0 20px;color:rgba(255,255,255,.75);max-width:560px;font-size:14.5px;}
.sh-crew form{display:flex;flex-wrap:wrap;gap:10px;align-items:center;}
.sh-crew input{flex:1 1 240px;border:none;border-radius:999px;padding:12px 18px;font-family:inherit;font-size:14px;outline:none;}
.sh-chip{border:1.5px solid rgba(255,255,255,.35);background:transparent;color:#fff;border-radius:999px;padding:9px 14px;font-weight:700;font-size:12.5px;cursor:pointer;font-family:inherit;}
.sh-chip.on{background:#fff;color:#181A4D;border-color:#fff;}
.sh-lime{background:#CAC307;color:#181A4D;border:none;border-radius:999px;padding:12px 22px;font-weight:800;font-size:13.5px;cursor:pointer;font-family:inherit;}
.sh-err{color:#FFB4A2;font-size:12.5px;font-weight:600;width:100%;}
@media(max-width:860px){.sh-feat{grid-template-columns:1fr;}.sh-cover{min-height:280px;}.sh-ways{grid-template-columns:1fr;}.sh h1{font-size:34px;}.sh-crew{padding:28px 22px;}}
`;

function ShopPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setUserId(data.session?.user.id ?? null); setSignedIn(!!data.session); });
  }, []);
  const upNext = useUpNext(userId);
  const upNextCount = (upNext.data ?? []).filter((r) => !r.kept).length;

  const product = useQuery({
    queryKey: ["shop-product", "abide-fall-winter"],
    queryFn: async (): Promise<Product | null> => {
      const { data } = await (supabase.from as any)("shop_products")
        .select("slug,title,subtitle,price_label,checkout_url,cover_image_url")
        .eq("slug", "abide-fall-winter").eq("is_active", true).maybeSingle();
      return data ?? null;
    },
  });
  const p = product.data;
  const scrollToCrew = () => document.getElementById("paper-crew")?.scrollIntoView({ behavior: "smooth" });

  return (
    <AppShell current="explore" hideSide={!signedIn} hideTopbar>
      <style dangerouslySetInnerHTML={{ __html: HOME_CSS + CSS }} />
      <HomeMasthead signedIn={signedIn} upNextCount={upNextCount} active="shop" />
      <div className="sh">
        <div className="sh-eyebrow">Explore · Shop</div>
        <h1>Shop</h1>
        <p className="sh-sub">Abide, in whatever medium today calls for. Paper days, iPad days, phone days: same rhythm, same boxes.</p>

        <section className="sh-feat">
          <div className="sh-cover">
            {p?.cover_image_url ? <img src={p.cover_image_url} alt={p.title} /> : <div className="sh-cover-ph">Abide · Fall / Winter</div>}
          </div>
          <div className="sh-info">
            <span className="sh-pill">Available now</span>
            <h2>{p?.title ?? "Abide · Fall/Winter"}</h2>
            <p className="sh-meta">{p?.subtitle ?? "Digital planner for GoodNotes · 90 days · undated"}</p>
            <div className="sh-price">{p?.price_label ?? "[PRICE]"}</div>
            <ul className="sh-checks">
              <li>Daily pages: Where are you, Read, Pray, To-do</li>
              <li>Workspace pages you can add as you need them</li>
              <li>Instant download, emailed to you too</li>
            </ul>
            <div className="sh-btns">
              {p?.checkout_url
                ? <a className="sh-btn navy" href={p.checkout_url} target="_blank" rel="noopener noreferrer">Buy now</a>
                : <Link className="sh-btn navy soon" to="/subscribe" search={{ topics: "abide_seasons" }}>Coming soon</Link>}
              <button type="button" className="sh-btn outline" onClick={scrollToCrew}>See inside</button>
            </div>
            <span className="sh-small">Works on iPad with GoodNotes 6.</span>
          </div>
        </section>

        <h3 className="sec">Three ways to abide</h3>
        <div className="sh-ways">
          <div className="sh-way">
            <span className="k">iPad</span>
            <h4>GoodNotes planner</h4>
            <p>Abide · Fall/Winter, 90 undated days for GoodNotes.</p>
            <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>Available now →</button>
          </div>
          <div className="sh-way dashed">
            <span className="k">Paper</span>
            <h4>90-day paper planner</h4>
            <p>For paper days. Coming once enough of you ask for it.</p>
            <button type="button" onClick={scrollToCrew}>Join the paper crew →</button>
          </div>
          <div className="sh-way">
            <span className="k">Phone and laptop</span>
            <h4>The CoCreate workspace</h4>
            <p>The same boxes, synced everywhere you sign in.</p>
            <Link to="/devotionals">Open your workspace →</Link>
          </div>
        </div>

        <PaperCrew />
      </div>
      <SiteFooter />
    </AppShell>
  );
}

function PaperCrew() {
  const [email, setEmail] = useState("");
  const [season, setSeason] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = z.string().trim().email().max(255).safeParse(email);
    if (!ok.success) { setErr("Please use a valid email."); return; }
    setErr(null); setBusy(true);
    const { error } = await (supabase.rpc as any)("subscribe_email", {
      _email: ok.data, _first_name: null, _tags: ["paper_crew"], _season: season, _source: "shop_paper_crew",
    });
    setBusy(false);
    if (error) { setErr("That didn't go through. Please try again."); return; }
    setDone(true);
  };
  return (
    <section className="sh-crew" id="paper-crew">
      <div className="k">THE PAPER CREW</div>
      <h3>A paper Abide is coming.</h3>
      <p>Join the list to see first designs, vote on season colors, and get first pick when pre-orders open.</p>
      {done ? (
        <p style={{ color: "#fff", fontWeight: 700, margin: 0 }}>You're in. Watch your inbox.</p>
      ) : (
        <form onSubmit={submit} noValidate>
          <input type="email" placeholder="Your email" value={email} maxLength={255} onChange={(e) => setEmail(e.target.value)} aria-label="Email" />
          {SEASONS.map((s) => (
            <button key={s.value} type="button" className={`sh-chip${season === s.value ? " on" : ""}`} aria-pressed={season === s.value}
              onClick={() => setSeason(season === s.value ? null : s.value)}>{s.label}</button>
          ))}
          <button className="sh-lime" type="submit" disabled={busy}>{busy ? "Joining…" : "Join the paper crew"}</button>
          {err && <span className="sh-err">{err}</span>}
        </form>
      )}
    </section>
  );
}
