"use client";

import { useRef, useState } from "react";
import { formateerTijd, afstandTekst } from "@/lib/geo";

// 🏅 Oorkonde bij de finish: een afbeelding met teamnaam, plaats, punten, tijd en afstand, om te delen
// in de groepsapp. Het kaartje staat buiten beeld klaar en wordt pas bij de knop een plaatje.
export default function Oorkonde({ teamNaam, icoon, routeNaam, punten, seconden, meters, plaats, aantalTeams }: {
  teamNaam: string; icoon: string | null; routeNaam: string | null; punten: number; seconden: number; meters: number;
  // Alleen als de uitslag vrij is
  plaats: number | null; aantalTeams: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [bezig, setBezig] = useState(false);
  const medaille = plaats === 1 ? "🥇" : plaats === 2 ? "🥈" : plaats === 3 ? "🥉" : "🏅";
  const datum = new Date().toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" });

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
      const bestand = new File([blob], `PointRush-oorkonde-${teamNaam.replace(/[^\p{L}\p{N}]+/gu, "-")}.png`, { type: "image/png" });
      if (navigator.canShare?.({ files: [bestand] })) {
        await navigator.share({ files: [bestand], text: `🏅 ${teamNaam} heeft PointRush uitgelopen!` }).catch(() => { /* geannuleerd */ });
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

  return (
    <>
      <button type="button" className="btn btn-ghost" onClick={maakEnDeel} disabled={bezig}
        style={{ width: "100%", fontSize: "0.95rem", padding: "13px 6px", borderRadius: 14, fontWeight: 800 }}>
        {bezig ? "⏳ Oorkonde maken…" : "🏅 Oorkonde delen"}
      </button>

      {/* Buiten beeld: het kaartje dat een plaatje wordt */}
      <div aria-hidden style={{ position: "fixed", left: -10000, top: 0, pointerEvents: "none" }}>
        <div ref={ref} className="oorkonde">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.webp" alt="" className="oorkonde-logo" />
          <div className="oorkonde-kop">Oorkonde</div>
          <div className="oorkonde-icoon">{icoon ?? "🏁"}</div>
          <div className="oorkonde-team">{teamNaam}</div>
          <div className="oorkonde-zin">heeft {routeNaam ? <>de route <strong>{routeNaam}</strong></> : "de route"} uitgelopen</div>
          {plaats !== null && (
            <div className="oorkonde-plaats">{medaille} {plaats}e plaats <span>van {aantalTeams} teams</span></div>
          )}
          <div className="oorkonde-cijfers">
            <div><strong>{punten}</strong><span>punten</span></div>
            <div><strong>{formateerTijd(seconden)}</strong><span>tijd</span></div>
            <div><strong>{meters ? afstandTekst(meters) : "—"}</strong><span>gelopen</span></div>
          </div>
          <div className="oorkonde-voet">{datum} · PointRush by Hoekies</div>
        </div>
      </div>
    </>
  );
}
