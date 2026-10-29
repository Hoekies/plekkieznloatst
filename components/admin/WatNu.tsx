"use client";

import Link from "next/link";
import type { LiveData, SpelerOverzicht } from "@/lib/admin-live";
import { openFotoKeuren } from "@/components/admin/FotoKeuren";

// 👉 Wat nu? Eén regel bovenaan het dashboard met de volgende stap voor de spelleider, voor, tijdens en na het
// spel, met de knop erbij. De details staan eronder (Klaarzetten, Spelleider); dit is het antwoord in één zin.
export default function WatNu({ data, spelend }: { data: LiveData; spelend: SpelerOverzicht[] }) {
  const { route, spelers } = data;
  const onderweg = spelend.filter((s) => s.sessie_status === "actief");
  const hulp = spelend.filter((s) => s.hulp);
  const fotos = data.wachtende_fotos ?? 0;
  const naarSpelleider = () => document.querySelector(".spelleider")?.scrollIntoView({ behavior: "smooth", block: "center" });

  let stap: { tekst: string; knop?: React.ReactNode; soort: "doe" | "rustig" | "klaar" };
  if (!route) stap = { soort: "doe", tekst: "Kies een route en activeer hem.", knop: <Link className="rl-knop rl-knop--cyan" href="/admin/routes">🗺️ Naar routes</Link> };
  else if (!spelers.length) stap = { soort: "doe", tekst: "Maak de teams aan.", knop: <Link className="rl-knop rl-knop--cyan" href="/admin/groepen">👫 Naar spelers</Link> };
  else if (!spelend.length) stap = { soort: "doe", tekst: "Deel de inlog uit; zodra een team op ‘Ga op pad’ drukt, begint het spel.", knop: <Link className="rl-knop rl-knop--cyan" href="/admin/groepen">📤 Uitdelen</Link> };
  else if (hulp.length) stap = { soort: "doe", tekst: `${hulp.map((s) => s.display_name).join(", ")} ${hulp.length === 1 ? "vraagt" : "vragen"} om hulp.`, knop: <button type="button" className="rl-knop rl-knop--cyan" onClick={naarSpelleider}>⚠️ Bekijken</button> };
  else if (fotos) stap = { soort: "doe", tekst: `Er ${fotos === 1 ? "wacht 1 foto" : `wachten ${fotos} foto's`} op keuring.`, knop: <button type="button" className="rl-knop rl-knop--cyan" onClick={openFotoKeuren}>📸 Keuren</button> };
  else if (onderweg.length) stap = { soort: "rustig", tekst: `Het spel loopt: ${onderweg.length} ${onderweg.length === 1 ? "team" : "teams"} onderweg. Niets te doen.` };
  else if (!route.uitslag_vrijgegeven) stap = { soort: "doe", tekst: "Iedereen is binnen: geef de uitslag vrij.", knop: <button type="button" className="rl-knop rl-knop--cyan" onClick={naarSpelleider}>🏆 Naar uitslag</button> };
  else stap = { soort: "klaar", tekst: "Uitslag vrijgegeven. Bewaar het rapport en ruim daarna op.", knop: <a className="rl-knop" href="/admin/rapport" target="_blank" rel="noopener noreferrer">📄 Rapport</a> };

  return (
    <div className={`wat-nu wat-nu--${stap.soort}`} role="status">
      <span className="wat-nu-label">👉 Wat nu?</span>
      <span className="wat-nu-tekst">{stap.tekst}</span>
      {stap.knop}
    </div>
  );
}
