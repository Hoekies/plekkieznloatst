"use client";

import { useEffect, useRef, useState } from "react";
import { VensterMetKop } from "@/components/shared/Venster";
import { toonMelding } from "@/components/admin/Melding";
import { elementNaarPng, deelOfDownload, bestandsnaamDeel } from "@/lib/delen";
import type { GroepPlaatjes as Data } from "@/lib/deel-plaatjes";
import { UitslagCijfersKaart, RoutePosterKaart, PrijzenKaart, InfographicKaart, RivaliteitenKaart } from "@/components/shared/Deelkaarten";

// 🖼️ Plaatjes voor de groepsapp (alleen de spelleider; spelers delen de uitslag niet): uitslag en cijfers, routeposter,
// prijzenuitreiking, infographic en rivalen. Alleen plaatjes, geen losse tekst. Bij het openen worden ze gemaakt;
// daarna deel je elk plaatje met één tik (deelmenu, of downloaden op een computer zonder deelmenu).
type Plaatje = { sleutel: string; naam: string; bestand: File; url: string };

export default function GroepPlaatjes({ knopClass = "rl-knop rl-knop--cyan" }: { knopClass?: string }) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<Data | null>(null);
  const [plaatjes, setPlaatjes] = useState<Plaatje[]>([]);
  const [bezig, setBezig] = useState(false);
  const refs = useRef<Record<string, HTMLDivElement | null>>({});

  // Openen: gegevens ophalen
  useEffect(() => {
    if (!open) return;
    setPlaatjes([]); setData(null);
    fetch("/api/admin/deelplaatjes", { cache: "no-store" }).then((r) => (r.ok ? r.json() : r.json().then((d) => Promise.reject(d.fout))))
      .then(setData).catch((f) => toonMelding(typeof f === "string" ? f : "Laden lukte niet", "fout"));
  }, [open]);

  // Welke plaatjes er zijn (een routeposter alleen met gelopen sporen, rivalen alleen als er items gegooid zijn)
  const lijst = data ? [
    { sleutel: "uitslag", naam: "🏆 Uitslag en cijfers", kaart: <UitslagCijfersKaart d={data} /> },
    ...(data.teams.some((t) => t.spoor.length > 1) ? [{ sleutel: "routes", naam: "🗺️ Routeposter", kaart: <RoutePosterKaart d={data} /> }] : []),
    ...(data.teams.some((t) => t.prijs) ? [{ sleutel: "prijzen", naam: "🎖️ Prijzenuitreiking", kaart: <PrijzenKaart d={data} /> }] : []),
    { sleutel: "cijfers", naam: "📊 Infographic", kaart: <InfographicKaart d={data} /> },
    ...(data.rivaliteit.length ? [{ sleutel: "rivalen", naam: "⚔️ Rivalen", kaart: <RivaliteitenKaart d={data} /> }] : []),
  ] : [];

  // Gegevens binnen: de kaartjes (buiten beeld) één voor één omzetten naar een plaatje
  useEffect(() => {
    if (!data) return;
    let weg = false;
    (async () => {
      setBezig(true);
      await new Promise((r) => setTimeout(r, 300));
      const uit: Plaatje[] = [];
      for (const p of lijst) {
        const el = refs.current[p.sleutel];
        if (!el || weg) continue;
        const bestand = await elementNaarPng(el, `PointRush-${p.sleutel}-${bestandsnaamDeel(data.route)}.png`).catch(() => null);
        if (bestand) uit.push({ sleutel: p.sleutel, naam: p.naam, bestand, url: URL.createObjectURL(bestand) });
        if (!weg) setPlaatjes([...uit]);
      }
      if (!weg) setBezig(false);
    })();
    return () => { weg = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);
  useEffect(() => () => plaatjes.forEach((p) => URL.revokeObjectURL(p.url)), [plaatjes]);

  async function deel(p: Plaatje) {
    const uit = await deelOfDownload(p.bestand);
    if (uit === "gedownload") toonMelding("Plaatje gedownload: stuur het in de groepsapp", "info");
  }

  return (
    <>
      <button type="button" className={knopClass} onClick={() => setOpen(true)} title="Plaatjes van de uitslag, de routes, de prijzen en meer, voor de groepsapp">
        🖼️ Plaatjes voor de groepsapp
      </button>
      {open && (
        <VensterMetKop icoon="🖼️" label="Delen" titel="Plaatjes voor de groepsapp" onSluit={() => setOpen(false)} breedte={640} maxHoogte={92}>
          {!data ? <p className="inst-uitleg">Laden…</p> : (
            <div className="groep-plaatjes">
              {lijst.map((p) => {
                const klaar = plaatjes.find((x) => x.sleutel === p.sleutel);
                return (
                  <div key={p.sleutel} className="groep-plaatje">
                    {klaar
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={klaar.url} alt={p.naam} />
                      : <div className="groep-plaatje-wacht">{bezig ? "⏳" : "⚠️"}</div>}
                    <span>{p.naam}</span>
                    <button type="button" className="rl-knop rl-knop--groen" disabled={!klaar} onClick={() => klaar && deel(klaar)}>📤 Delen</button>
                  </div>
                );
              })}
            </div>
          )}
        </VensterMetKop>
      )}
      {/* De kaartjes zelf, buiten beeld, om er een plaatje van te maken */}
      {open && data && (
        <div aria-hidden style={{ position: "fixed", left: -10000, top: 0, pointerEvents: "none" }}>
          {lijst.map((p) => <div key={p.sleutel} ref={(el) => { refs.current[p.sleutel] = el?.firstElementChild as HTMLDivElement | null; }}>{p.kaart}</div>)}
        </div>
      )}
    </>
  );
}
