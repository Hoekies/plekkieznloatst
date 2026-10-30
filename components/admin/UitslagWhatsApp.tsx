"use client";

import { useEffect, useState } from "react";
import { toonMelding } from "@/components/admin/Melding";
import { deelViaWhatsApp } from "@/lib/deel-tekst";

// 💬 De hele uitslag (stand, prijzen, cijfers per team, records) in één WhatsApp-bericht, om in de groepsapp te delen.
// De tekst staat al klaar voordat je tikt, zodat WhatsApp meteen opent (anders houdt de browser het venster tegen).
export default function UitslagWhatsApp() {
  const [tekst, setTekst] = useState<string | null>(null);
  useEffect(() => {
    let weg = false;
    const haal = () => fetch("/api/admin/uitslag-tekst", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (!weg && d?.tekst) setTekst(d.tekst); }).catch(() => undefined);
    haal();
    const t = setInterval(haal, 30_000);
    return () => { weg = true; clearInterval(t); };
  }, []);

  async function deel() {
    if (!tekst) return;
    const uit = await deelViaWhatsApp(tekst);
    if (uit === "gekopieerd") toonMelding("Uitslag ook gekopieerd: staan er vraagtekens in WhatsApp, plak dan met Ctrl+V", "info");
  }
  return (
    <button type="button" className="rl-knop rl-knop--groen" disabled={!tekst} onClick={deel} title="De hele uitslag met alle cijfers in één bericht, voor de groepsapp">
      💬 Uitslag via WhatsApp
    </button>
  );
}
