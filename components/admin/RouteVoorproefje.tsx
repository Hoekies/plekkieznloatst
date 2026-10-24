"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { SITE } from "@/lib/qr-inlog";
import dynamic from "next/dynamic";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { haversine } from "@/lib/geo";
import { spelUitleg } from "@/lib/spelmodus-uitleg";
import { ITEM_INFO } from "@/components/speler/SpeciaalItemLegende";
import { toonMelding } from "@/components/admin/Melding";
import type { RouteModus } from "@/types/database";
import { deelOfDownload, downloadBestand } from "@/lib/delen";

const VoorproefKaart = dynamic(() => import("./VoorproefKaart"), { ssr: false });

export type VoorproefVraag = {
  id: string; type: string; tekst: string; afbeelding: string | null; punten: number;
  opties: { id: string; kleur: string; tekst: string | null; afbeelding: string | null }[];
};
export type VoorproefData = {
  route: { id: string; name: string; modus: RouteModus; ster: number; bom: number; spookSec: number; plekzooiSec: number; huis_logo?: string | null };
  punten: { lat: number; lng: number; eind: boolean }[];
  vragen: VoorproefVraag[];
  items: { id: string; type: string; lat: number; lng: number }[];
};

const OPSLAG = `${process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""}/storage/v1/object/public/vraag-afbeeldingen/`;
const SOORT: Record<string, { naam: string; icoon: string }> = {
  meerkeuze_tekst: { naam: "Meerkeuze", icoon: "🔤" },
  meerkeuze_afbeelding: { naam: "Meerkeuze met plaatjes", icoon: "🖼️" },
  open: { naam: "Open vraag", icoon: "✏️" },
  foto_opdracht: { naam: "Foto-opdracht", icoon: "📸" },
  stemvraag: { naam: "Stemvraag", icoon: "🗳️" },
};
const KLEUR: Record<string, string> = { geel: "#F59E0B", blauw: "#1E40AF", rood: "#EF4444", groen: "#16A34A" };
const A4_B = 794, A4_H = 1123;  // A4 bij 96 dpi

// Alleen de eerste zin van een uitleg (het vel is maar één A4)
function eersteZin(t: string): string {
  return t.match(/^[^.!?]*[.!?]/)?.[0] ?? t;
}

// Drie vragen van zoveel mogelijk verschillende soorten, verspreid over de route
function kiesVragen(vragen: VoorproefVraag[], willekeurig: boolean): string[] {
  const pool = willekeurig ? [...vragen].sort(() => Math.random() - 0.5) : vragen;
  const gekozen: VoorproefVraag[] = [];
  for (const soort of ["meerkeuze_tekst", "open", "foto_opdracht", "meerkeuze_afbeelding"]) {
    const kandidaten = pool.filter((v) => v.type === soort);
    const v = willekeurig ? kandidaten[0] : kandidaten[Math.floor(kandidaten.length / 2)];
    if (v && gekozen.length < 3) gekozen.push(v);
  }
  for (const v of pool) if (gekozen.length < 3 && !gekozen.includes(v)) gekozen.push(v);
  return gekozen.map((v) => v.id);
}

export default function RouteVoorproefje({ data }: { data: VoorproefData }) {
  const { route, punten, vragen, items } = data;
  const [gekozen, setGekozen] = useState<string[]>(() => kiesVragen(vragen, false));
  const [opties, setOpties] = useState(true);
  const [pdf, setPdf] = useState<File | null>(null);
  const [bezig, setBezig] = useState(false);

  // Het A4-vel passend maken op een smal scherm (bij het maken van de PDF even op ware grootte)
  const vakRef = useRef<HTMLDivElement>(null);
  const velRef = useRef<HTMLDivElement>(null);
  const [schaal, setSchaal] = useState(1);
  const [opWareGrootte, setOpWareGrootte] = useState(false);
  useEffect(() => {
    const vak = vakRef.current;
    if (!vak) return;
    const meet = () => setSchaal(Math.min(1, vak.clientWidth / A4_B));
    meet();
    const ro = new ResizeObserver(meet);
    ro.observe(vak);
    return () => ro.disconnect();
  }, []);
  // Andere keuze = de oude PDF klopt niet meer
  useEffect(() => { setPdf(null); }, [gekozen, opties]);

  const uitleg = spelUitleg(route.modus);
  const getoond = gekozen.map((id) => vragen.find((v) => v.id === id)).filter((v): v is VoorproefVraag => !!v);

  // Schattingen: hemelsbreed × 1,3 voor de straten, wandeltempo 4,5 km/u en ±1,5 min per vraag
  const { km, minuten } = useMemo(() => {
    let m = 0;
    for (let i = 1; i < punten.length; i++) m += haversine(punten[i - 1].lat, punten[i - 1].lng, punten[i].lat, punten[i].lng);
    if (route.modus === "verspreid" && punten.length > 2) m += haversine(punten[punten.length - 1].lat, punten[punten.length - 1].lng, punten[0].lat, punten[0].lng);
    m *= 1.3;
    return { km: m / 1000, minuten: Math.round((m / 75 + vragen.length * 1.5) / 5) * 5 };
  }, [punten, vragen.length, route.modus]);
  const duurTekst = minuten >= 60 ? `${Math.floor(minuten / 60)} uur${minuten % 60 ? ` ${minuten % 60} min` : ""}` : `${minuten} min`;

  const perSoort = Object.entries(vragen.reduce<Record<string, number>>((acc, v) => ({ ...acc, [v.type]: (acc[v.type] ?? 0) + 1 }), {}));
  const itemTelling = Object.keys(ITEM_INFO)
    .map((type) => ({ type, aantal: items.filter((i) => i.type === type).length }))
    .filter((t) => t.aantal > 0);
  const waarden = { ster: route.ster, bom: route.bom, spookSec: route.spookSec, plekzooiSec: route.plekzooiSec };

  function wissel(id: string) {
    setGekozen((g) => g.includes(id) ? g.filter((x) => x !== id) : [...g, id].slice(-3));
  }

  const veilig = route.name.replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "");
  async function maakPdf() {
    if (!velRef.current) return;
    setBezig(true);
    setOpWareGrootte(true);
    try {
      await new Promise((r) => setTimeout(r, 400));  // kaart en afbeeldingen op ware grootte laten tekenen
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import("html2canvas-pro"), import("jspdf")]);
      const canvas = await html2canvas(velRef.current, { scale: 2, useCORS: true, backgroundColor: "#3a1f80", logging: false });
      const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });
      doc.setFillColor(28, 12, 69);
      doc.rect(0, 0, 210, 297, "F");
      // Past het vel niet precies, dan schalen we het in z'n geheel binnen de A4
      const verhouding = canvas.height / canvas.width;
      const b = Math.min(210, 297 / verhouding), h = b * verhouding;
      doc.addImage(canvas.toDataURL("image/jpeg", 0.88), "JPEG", (210 - b) / 2, 0, b, h);
      setPdf(new File([doc.output("blob")], `PointRush-voorproefje-${veilig}.pdf`, { type: "application/pdf" }));
    } catch {
      toonMelding("PDF maken mislukt. Wacht tot de kaart geladen is en probeer het opnieuw.", "fout");
    } finally {
      setOpWareGrootte(false);
      setBezig(false);
    }
  }
  async function versturen(f: File) {
    const tekst = `🎯 Zin in een speurtocht? Een voorproefje van "${route.name}" in PointRush!`;
    if (await deelOfDownload(f, tekst) !== "gedownload") return;
    window.open(`https://wa.me/?text=${encodeURIComponent(tekst + " (PDF is gedownload, voeg hem toe als bijlage)")}`, "_blank");
  }

  const s = opWareGrootte ? 1 : schaal;
  return (
    <>
      <div className="admin-topbar">
        <span className="admin-topbar-titel">📄 Voorproefje</span>
      </div>
      <div className="admin-content" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Bediening */}
        <div className="pr-gem-panel">
          <div className="pr-gem-panel-inner" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <Link href="/admin/routes" className="rl-knop actie-knop">← Routes</Link>
              <span style={{ flex: 1 }} />
              {!pdf ? (
                <button type="button" className="rl-knop rl-knop--cyan actie-knop" disabled={bezig} onClick={maakPdf}>{bezig ? "⏳ PDF maken…" : "📄 PDF maken"}</button>
              ) : (
                <>
                  <button type="button" className="rl-knop rl-knop--goud actie-knop" onClick={() => versturen(pdf)} title="Opent het deelmenu: kies WhatsApp">📲 Versturen</button>
                  <button type="button" className="rl-knop actie-knop" onClick={() => downloadBestand(pdf)}>⬇️ Opslaan</button>
                </>
              )}
            </div>
            <div style={{ fontSize: "0.8rem", color: "var(--muted)" }}>
              Kies welke vragen als voorbeeld op het vel staan (maximaal 3). De goede antwoorden, de puntnamen en de precieze route staan er nooit op.
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {vragen.map((v, i) => {
                const aan = gekozen.includes(v.id);
                return (
                  <button key={v.id} type="button" onClick={() => wissel(v.id)} title={v.tekst}
                    className={`rl-knop${aan ? " rl-knop--cyan" : ""}`} style={{ fontSize: "0.76rem" }}>
                    {aan ? "✓ " : ""}{SOORT[v.type]?.icoon ?? "❓"} Vraag {i + 1}
                  </button>
                );
              })}
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button type="button" className="rl-knop" onClick={() => setGekozen(kiesVragen(vragen, true))} disabled={vragen.length <= 3}>🔀 Andere vragen</button>
              <button type="button" className={`rl-knop${opties ? " rl-knop--cyan" : ""}`} onClick={() => setOpties((o) => !o)}>
                {opties ? "✓ " : ""}Antwoordopties tonen
              </button>
            </div>
          </div>
        </div>

        {/* Het A4-vel */}
        <div ref={vakRef} style={{ width: "100%", height: A4_H * s, overflow: "hidden" }}>
          <div style={{ width: A4_B, transform: `scale(${s})`, transformOrigin: "top left" }}>
            <div ref={velRef} className="vp-vel">
              <style>{`
                .vp-vel { width: ${A4_B}px; height: ${A4_H}px; box-sizing: border-box; padding: 26px 30px; overflow: hidden;
                  display: flex; flex-direction: column; gap: 14px; color: #fff; font-family: var(--font);
                  background: linear-gradient(180deg, #5b34a8 0%, #3a1f80 55%, #26125c 100%); }
                .vp-vel h1, .vp-vel h2 { margin: 0; font-family: var(--font-display); font-weight: 800; color: #fff; }
                .vp-tegels { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; }
                .vp-tegel { padding: 8px 10px; border-radius: 12px; background: rgba(255,255,255,0.07); border: 1.5px solid rgba(255,217,59,0.45); }
                .vp-tegel b { display: block; font-family: var(--font-display); font-size: 20px; color: #fff; }
                .vp-tegel span { font-size: 10.5px; color: #C9B6FF; text-transform: uppercase; letter-spacing: 0.04em; font-weight: 700; }
                .vp-tegel small { display: block; font-size: 10px; color: #B8AED6; margin-top: 1px; }
                .vp-vragen { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
                .vp-vraag { padding: 10px; border-radius: 12px; background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.16); display: flex; flex-direction: column; gap: 6px; min-width: 0; }
                .vp-vraag-tekst { font-size: 12.5px; font-weight: 700; line-height: 1.3; display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden; }
                .vp-optie { font-size: 10.5px; font-weight: 700; color: #fff; padding: 4px 7px; border-radius: 6px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
                .vp-items { display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px 14px; }
                .vp-item { display: flex; gap: 8px; align-items: flex-start; font-size: 10px; color: #D9D0F5; line-height: 1.3; }
                .vp-item b { color: #fff; font-size: 11px; }
              `}</style>

              {/* Kop */}
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/spellogo/breed.webp" alt="PointRush" style={{ height: 76, width: "auto" }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, color: "#FFE680", letterSpacing: "0.1em", fontSize: 12 }}>VOORPROEFJE</div>
                  <h1 style={{ fontSize: 28, lineHeight: 1.1 }}>{route.name}</h1>
                  <div style={{ fontSize: 13, color: "#D9D0F5", marginTop: 3 }}>{uitleg.emoji} {uitleg.samenvatting}</div>
                </div>
                {/* Eigen logo van de organisatie (huisstijl van deze route) */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {route.huis_logo && <img src={route.huis_logo} alt="" crossOrigin="anonymous" style={{ height: 70, maxWidth: 170, objectFit: "contain", flexShrink: 0 }} />}
              </div>

              {/* Kerngetallen */}
              <div className="vp-tegels">
                <div className="vp-tegel"><span>📍 Punten</span><b>{punten.length}</b></div>
                <div className="vp-tegel"><span>❓ Vragen</span><b>{vragen.length}</b>
                  <small>{perSoort.map(([t, n]) => `${n} ${SOORT[t]?.naam.toLowerCase() ?? t}`).join(" · ")}</small></div>
                <div className="vp-tegel"><span>🚶 Afstand</span><b>± {km.toFixed(1).replace(".", ",")} km</b></div>
                <div className="vp-tegel"><span>⏱ Speelduur</span><b>± {duurTekst}</b></div>
                <div className="vp-tegel"><span>🎒 Items</span><b>{items.length}</b><small>{itemTelling.length} soorten</small></div>
              </div>

              {/* Speelgebied */}
              <div>
                <div style={{ height: 330, borderRadius: 14, overflow: "hidden", border: "2px solid rgba(255,255,255,0.18)" }}>
                  <VoorproefKaart punten={punten} items={items} />
                </div>
                <div style={{ fontSize: 10.5, color: "#B8AED6", marginTop: 4 }}>
                  Het speelgebied. De items liggen er ongeveer zo verspreid; waar de punten precies liggen en hoe de route loopt, ontdek je pas tijdens het spel.
                </div>
              </div>

              {/* Voorbeeldvragen */}
              {getoond.length > 0 && (
                <div>
                  <h2 style={{ fontSize: 16, marginBottom: 8 }}>🧩 Zo zien de vragen eruit</h2>
                  <div className="vp-vragen">
                    {getoond.map((v) => (
                      <div key={v.id} className="vp-vraag">
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#C9B6FF", fontWeight: 700, textTransform: "uppercase" }}>
                          <span>{SOORT[v.type]?.icoon} {SOORT[v.type]?.naam ?? v.type}</span>
                          <span style={{ color: "#FFE680" }}>{v.punten} pt</span>
                        </div>
                        {v.afbeelding && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={OPSLAG + v.afbeelding} alt="" crossOrigin="anonymous" style={{ width: "100%", height: 90, objectFit: "cover", borderRadius: 8 }} />
                        )}
                        <div className="vp-vraag-tekst">{v.tekst}</div>
                        {v.type === "open" && (
                          <div style={{ height: 26, borderRadius: 6, border: "1.5px dashed rgba(255,255,255,0.35)", fontSize: 10, color: "#B8AED6", display: "flex", alignItems: "center", padding: "0 8px" }}>Typ je antwoord…</div>
                        )}
                        {v.type === "foto_opdracht" && (
                          <div style={{ height: 26, borderRadius: 6, background: "rgba(0,217,255,0.15)", border: "1px solid rgba(0,217,255,0.4)", fontSize: 10.5, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>📸 Maak een foto</div>
                        )}
                        {opties && v.opties.length > 0 && (
                          <div style={{ display: "grid", gridTemplateColumns: v.opties.some((o) => o.afbeelding) ? "1fr 1fr" : "1fr", gap: 4 }}>
                            {v.opties.map((o) => o.afbeelding ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img key={o.id} src={OPSLAG + o.afbeelding} alt="" crossOrigin="anonymous"
                                style={{ width: "100%", height: 46, objectFit: "cover", borderRadius: 6, border: `2px solid ${KLEUR[o.kleur] ?? "#888"}` }} />
                            ) : (
                              <div key={o.id} className="vp-optie" style={{ background: KLEUR[o.kleur] ?? "#555" }}>{o.tekst}</div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Items */}
              {itemTelling.length > 0 && (
                <div>
                  <h2 style={{ fontSize: 16, marginBottom: 8 }}>🎒 Items om op te pakken</h2>
                  <div className="vp-items">
                    {itemTelling.slice(0, 10).map((t) => (
                      <div key={t.type} className="vp-item">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={`/items/${t.type}.webp`} alt="" style={{ width: 24, height: 24, flexShrink: 0 }} />
                        <span><b>{ITEM_INFO[t.type].naam} ×{t.aantal}</b> · {eersteZin(ITEM_INFO[t.type].beschrijving(waarden))}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Onderaan */}
              <div style={{ marginTop: "auto", display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 14, background: "rgba(255,217,59,0.12)", border: "1.5px solid rgba(255,217,59,0.5)" }}>
                <div style={{ background: "#fff", padding: 5, borderRadius: 8, lineHeight: 0 }}>
                  <QRCodeSVG value={SITE} size={62} />
                </div>
                <div>
                  <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 18, color: "#FFE680" }}>Zin om mee te spelen?</div>
                  <div style={{ fontSize: 12, color: "#D9D0F5" }}>Speel met je eigen telefoon, in teams, buiten. {SITE.replace("https://", "")}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
