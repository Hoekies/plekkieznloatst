"use client";

import { useRef, useState } from "react";

export type UitslagTeam = { naam: string; icon: string | null; score: number; plaats: number; eigen?: boolean };

// 🖼️ Uitslag als afbeelding om te delen (WhatsApp, Instagram): podium met de top 3 en de rest eronder.
// Het kaartje staat buiten beeld klaar en wordt pas bij de knop een plaatje (zoals de oorkonde).
export default function UitslagDelen({ stand, routeNaam, knopClass = "btn btn-ghost", knopStijl }: {
  stand: UitslagTeam[]; routeNaam: string | null; knopClass?: string; knopStijl?: React.CSSProperties;
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
      const { default: html2canvas } = await import("html2canvas-pro");
      await document.fonts?.ready;
      await Promise.all([...ref.current.querySelectorAll("img")].map((img) => img.decode().catch(() => undefined)));
      const canvas = await html2canvas(ref.current, { scale: 2, backgroundColor: null, logging: false });
      const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/png"));
      if (!blob) return;
      const bestand = new File([blob], `PointRush-uitslag${routeNaam ? `-${routeNaam.replace(/[^\p{L}\p{N}]+/gu, "-")}` : ""}.png`, { type: "image/png" });
      if (navigator.canShare?.({ files: [bestand] })) {
        await navigator.share({ files: [bestand], text: `🏆 Uitslag${routeNaam ? ` van ${routeNaam}` : ""}` }).catch(() => { /* geannuleerd */ });
      } else {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(bestand);
        a.download = bestand.name;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      }
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
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.webp" alt="" className="uitslag-kaart-logo" />
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
