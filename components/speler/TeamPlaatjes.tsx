"use client";

import { useEffect, useRef, useState } from "react";
import { elementNaarPng, deelOfDownload, bestandsnaamDeel } from "@/lib/delen";
import type { TeamPlaatjes as Data } from "@/lib/deel-plaatjes";
import { TeamKaart, OnsRondjeKaart } from "@/components/shared/Deelkaarten";

// 🃏 Teamkaart en 🗺️ ons rondje: plaatjes van het eigen team om te delen (na de uitslag). Alleen plaatjes, geen tekst.
// De kaartjes staan buiten beeld klaar en worden pas bij de knop een plaatje (zoals de oorkonde).
export default function TeamPlaatjes() {
  const [data, setData] = useState<Data | null>(null);
  const [bezig, setBezig] = useState<string | null>(null);
  const kaartRef = useRef<HTMLDivElement>(null);
  const rondjeRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    fetch("/api/speler/deelplaatjes", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).then((d) => d && setData(d)).catch(() => undefined);
  }, []);
  if (!data) return null;

  async function deel(soort: "kaart" | "rondje") {
    const el = soort === "kaart" ? kaartRef.current : rondjeRef.current;
    if (!el) return;
    setBezig(soort);
    try {
      const f = await elementNaarPng(el, `PointRush-${soort === "kaart" ? "teamkaart" : "ons-rondje"}-${bestandsnaamDeel(data!.naam)}.png`);
      if (f) await deelOfDownload(f);
    } finally {
      setBezig(null);
    }
  }

  return (
    <>
      <div className="team-plaatjes">
        <button type="button" className="btn btn-ghost" disabled={!!bezig} onClick={() => deel("kaart")}>{bezig === "kaart" ? "⏳ Maken…" : "🃏 Teamkaart delen"}</button>
        {data.spoor.length > 1 && <button type="button" className="btn btn-ghost" disabled={!!bezig} onClick={() => deel("rondje")}>{bezig === "rondje" ? "⏳ Maken…" : "🗺️ Ons rondje delen"}</button>}
      </div>
      <div aria-hidden style={{ position: "fixed", left: -10000, top: 0, pointerEvents: "none" }}>
        <div ref={kaartRef} style={{ display: "inline-block" }}><TeamKaart d={data} /></div>
        <div ref={rondjeRef} style={{ display: "inline-block" }}><OnsRondjeKaart d={data} /></div>
      </div>
    </>
  );
}
