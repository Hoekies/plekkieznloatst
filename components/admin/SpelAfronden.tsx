"use client";

import { useState } from "react";
import Link from "next/link";
import type { SpelerOverzicht } from "@/lib/admin-live";
import { VensterMetKop } from "@/components/shared/Venster";
import BevestigKnop from "@/components/admin/BevestigKnop";
import NieuwSpelKnop from "@/components/admin/NieuwSpelKnop";
import { toonMelding } from "@/components/admin/Melding";
import { uitlegBijStatus } from "@/lib/fout-uitleg";
import { openKaartjes } from "@/components/admin/InlogUitdelen";
import Icoon from "@/components/admin/Icoon";

// Twee knoppen, elk met een eigen venster in stappen:
// 🏁 Afronden: (1) wie nog onderweg is stoppen, (2) uitslag vrijgeven, (3) rapport en foto's bewaren.
// 🧹 Opruimen: (1) nieuw spel voorbereiden, (2) eventueel een volgende groep met nieuwe wachtwoorden.
// Elke stap heeft één knop; een gedane stap krijgt een vinkje. Een stap overslaan mag (bijv. alleen opruimen
// na een testspel). Opruimen is de enige plek om alles op te ruimen.
export default function SpelAfronden({ spelend, uitslagVrij, onGewijzigd }: {
  spelend: SpelerOverzicht[]; uitslagVrij: boolean; onGewijzigd: () => void;
}) {
  const [open, setOpen] = useState<"afronden" | "opruimen" | null>(null);
  const [rapportOpen, setRapportOpen] = useState(false);
  const [vrij, setVrij] = useState<boolean | null>(null);
  const onderweg = spelend.filter((s) => s.sessie_status === "actief");
  const uitslag = vrij ?? uitslagVrij;

  async function stopAlle() {
    const uit = await Promise.all(onderweg.map((s) => fetch(`/api/admin/groepen/${s.player_id}/spel-stoppen`, { method: "POST" }).then((r) => r.ok).catch(() => false)));
    const goed = uit.filter(Boolean).length;
    toonMelding(goed === onderweg.length ? `${goed} ${goed === 1 ? "team" : "teams"} gestopt` : "Stoppen lukte niet bij elk team", goed === onderweg.length ? "ok" : "fout");
    onGewijzigd();
  }
  async function geefUitslagVrij() {
    const res = await fetch("/api/admin/uitslag", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ vrij: true }),
    }).catch(() => null);
    toonMelding(res?.ok ? "Uitslag vrijgegeven: iedereen ziet de eindstand" : uitlegBijStatus(res?.status ?? 0, "Uitslag vrijgeven"), res?.ok ? "ok" : "fout");
    if (res?.ok) { setVrij(true); onGewijzigd(); }
  }

  // 🔁 Volgende groep met dezelfde logins: nieuwe wachtwoorden, namen en telefoons eraf, en meteen de kaartjes
  async function nieuweGroep() {
    const res = await fetch("/api/admin/groepen/kaartjes", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nieuweGroep: true }),
    }).catch(() => null);
    const data = res ? await res.json().catch(() => ({})) : {};
    if (!res?.ok) { toonMelding(uitlegBijStatus(res?.status ?? 0, "Nieuwe groep", data.fout), "fout"); return; }
    setNieuweGroepKlaar(true);
    toonMelding("Nieuwe wachtwoorden gemaakt: de kaartjes staan klaar om te printen", "ok");
    if (data.inlogs?.length) openKaartjes(data.inlogs);
  }
  const [nieuweGroepKlaar, setNieuweGroepKlaar] = useState(false);

  const stap = (nr: number, klaar: boolean, titel: string, uitleg: string, knop: React.ReactNode) => (
    <div className={`afrond-stap${klaar ? " afrond-stap--klaar" : ""}`}>
      <span className="afrond-nr" aria-hidden>{klaar ? <Icoon naam="klaar" /> : nr}</span>
      <div className="afrond-tekst"><strong>{titel}</strong><span>{uitleg}</span></div>
      <div className="afrond-knop">{knop}</div>
    </div>
  );

  return (
    <>
      <button type="button" className="rl-knop rl-knop--cyan actie-knop" onClick={() => setOpen("afronden")}>
        <Icoon naam="vlag" /> Afronden
      </button>
      <button type="button" className="rl-knop actie-knop" onClick={() => setOpen("opruimen")}>
        <Icoon naam="wissen" /> Opruimen
      </button>
      {open === "afronden" && (
        <VensterMetKop icoon="🏁" label="Spel afronden" titel="In drie stappen klaar" onSluit={() => setOpen(null)} breedte={520} maxHoogte={92}>
          <div className="afrond-stappen">
            {stap(1, onderweg.length === 0, "Iedereen stoppen",
              onderweg.length ? `Nog ${onderweg.length} ${onderweg.length === 1 ? "team" : "teams"} onderweg: ${onderweg.map((s) => s.display_name).join(", ")}` : "Niemand meer onderweg",
              onderweg.length > 0 && (
                <BevestigKnop venster icoon="⏹️" titel={`${onderweg.length} ${onderweg.length === 1 ? "team" : "teams"} stoppen?`} vraag=""
                  uitleg="Hun spel stopt nu; de punten die ze hebben blijven staan." ja="Ja, stoppen" onBevestig={stopAlle} className="rl-knop rl-knop--rood">
                  <Icoon naam="stoppen" /> Stoppen
                </BevestigKnop>
              ))}
            {stap(2, uitslag, "Uitslag vrijgeven", uitslag ? "Iedereen ziet de eindstand en het podium" : "Alle teams zien de eindstand en het podium",
              !uitslag && <button type="button" className="rl-knop rl-knop--cyan" onClick={geefUitslagVrij}><Icoon naam="uitslag" /> Vrijgeven</button>)}
            {stap(3, rapportOpen, "Rapport en foto's bewaren", "Het rapport (PDF) en bij Antwoorden de Excel, PDF per team en het fotoalbum",
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
                <a className="rl-knop" href="/admin/rapport" target="_blank" rel="noopener noreferrer" onClick={() => setRapportOpen(true)}><Icoon naam="rapport" /> Rapport</a>
                <Link className="rl-knop" href="/admin/antwoorden" onClick={() => setOpen(null)}><Icoon naam="downloaden" /> Antwoorden</Link>
              </div>)}
          </div>
        </VensterMetKop>
      )}
      {open === "opruimen" && (
        <VensterMetKop icoon="🧹" label="Opruimen" titel="Klaar voor het volgende spel" onSluit={() => setOpen(null)} breedte={520} maxHoogte={92}>
          <div className="afrond-stappen">
            {stap(1, false, "Nieuw spel voorbereiden", "Spellen, antwoorden en foto's weg; routes, vragen en spelers blijven. Bewaar eerst het rapport bij 🏁 Afronden.",
              <NieuwSpelKnop className="rl-knop rl-knop--rood" onKlaar={() => { setOpen(null); window.location.reload(); }} />)}
            {stap(2, nieuweGroepKlaar, "Volgende groep (optioneel)", "Zelfde logins, maar nieuwe wachtwoorden; teamnaam, icoon en telefoon gaan eraf. Teams weghalen kan bij Spelers.",
              <BevestigKnop venster icoon="🔁" titel="Nieuwe groep voorbereiden?" vraag=""
                uitleg="Alle teams krijgen een nieuw wachtwoord en worden uitgelogd; de oude kaartjes werken niet meer. Teamnaam, icoon en telefoonnummer gaan eraf. Daarna openen de nieuwe kaartjes om te printen."
                ja="Ja, nieuwe wachtwoorden" onBevestig={nieuweGroep} className="rl-knop">
                <Icoon naam="sleutel" /> Nieuwe groep
              </BevestigKnop>)}
          </div>
        </VensterMetKop>
      )}
    </>
  );
}
