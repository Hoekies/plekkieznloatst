"use client";

import { useRef, useState } from "react";
import { elementNaarPng, deelOfDownload, bestandsnaamDeel } from "@/lib/delen";

type UitslagTeam = { naam: string; icon: string | null; score: number; plaats: number; eigen?: boolean };

// 🖼️ Uitslag als afbeelding om te delen (WhatsApp, Instagram): podium met de top 3 en de rest eronder.
// Het kaartje staat buiten beeld klaar en wordt pas bij de knop een plaatje (zoals de oorkonde).
// huisLogo: eigen logo van de organisatie (huisstijl van de route), komt naast het PointRush-logo
export default function UitslagDelen({ stand, routeNaam, huisLogo = null, knopClass = "btn btn-ghost", knopStijl }: {
  stand: UitslagTeam[]; routeNaam: string | null; huisLogo?: string | null; knopClass?: string; knopStijl?: React.CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [bezig, setBezig] = useState(false);
  const datum = new Date().toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" });
  const top = (p: number) => stand.filter((t) => t.plaats === p);
  const rest = stand.filter((t) => t.plaats > 3).slice(0, 7);

  async function maakEnDeel() {
    if (!ref.current) return;
    setBezig(true);
    try {
      const bestand = await elementNaarPng(ref.current, `PointRush-uitslag${routeNaam ? `-${bestandsnaamDeel(routeNaam)}` : ""}.png`);
      if (bestand) await deelOfDownload(bestand, `🏆 Uitslag${routeNaam ? ` van ${routeNaam}` : ""}`);
    } finally {
      setBezig(false);
    }
  }

  if (!stand.length) return null;
  return (
    <>
      <button type="button" className={knopClass} onClick={maakEnDeel} disabled={bezig} style={knopStijl}>
        {bezig ? "⏳ Afbeelding maken…" : "🖼️ Uitslag delen"}
      </button>
      <div aria-hidden style={{ position: "fixed", left: -10000, top: 0, pointerEvents: "none" }}>
        <div ref={ref} className="uitslag-kaart">
          <div className="uitslag-kaart-logos">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/spellogo/vierkant.webp" alt="" className="uitslag-kaart-logo" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {huisLogo && <img src={huisLogo} alt="" crossOrigin="anonymous" className="uitslag-kaart-huislogo" />}
          </div>
          <div className="uitslag-kaart-kop">Uitslag</div>
          {routeNaam && <div className="uitslag-kaart-route">{routeNaam}</div>}
          <div className="uitslag-kaart-podium">
            {[2, 1, 3].map((p) => (
              <div key={p} className={`uitslag-kaart-plek uitslag-kaart-plek--${p}`}>
                {top(p).map((t) => (
                  <div key={t.naam} className={`uitslag-kaart-team${t.eigen ? " uitslag-kaart-team--eigen" : ""}`}>
                    <span className="uitslag-kaart-icoon">{t.icon ?? "👫"}</span>
                    <span className="uitslag-kaart-naam">{t.naam}</span>
                    <span className="uitslag-kaart-score">{t.score} pt</span>
                  </div>
                ))}
                <div className="uitslag-kaart-blok">{p === 1 ? "🥇" : p === 2 ? "🥈" : "🥉"}</div>
              </div>
            ))}
          </div>
          {rest.length > 0 && (
            <div className="uitslag-kaart-rest">
              {rest.map((t) => (
                <div key={t.naam} className={t.eigen ? "uitslag-kaart-team--eigen" : undefined}>
                  <span>{t.plaats}.</span><span>{t.icon ?? "👫"} {t.naam}</span><strong>{t.score} pt</strong>
                </div>
              ))}
            </div>
          )}
          <div className="uitslag-kaart-voet">{datum} · PointRush by Hoekies</div>
        </div>
      </div>
    </>
  );
}
