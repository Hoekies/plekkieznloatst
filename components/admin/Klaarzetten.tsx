"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { SpelerOverzicht } from "@/lib/admin-live";
import EindtijdKnop from "@/components/admin/EindtijdKnop";

const VOORVOEGSEL = "pointrush_klaarzetten_";
const LEEG_EVENT = "pointrush-klaarzetten-leeg";

// Na "Reset spel": de zelf gezette vinkjes wissen, een nieuwe groep begint met een leeg stappenplan
export function wisKlaarzetten() {
  try {
    Object.keys(localStorage).filter((k) => k.startsWith(VOORVOEGSEL)).forEach((k) => localStorage.removeItem(k));
  } catch { /* geen opslag */ }
  window.dispatchEvent(new Event(LEEG_EVENT));
}

// Stappenplan "Spel klaarzetten": wat kan, controleert de app zelf; de rest vink je af.
// Afgevinkte stappen worden per route onthouden (in deze browser), tot een reset.
export default function Klaarzetten({ route, spelers: alleSpelers }: { route: { id: string; name: string; modus?: string; verwacht_aantal_teams?: number; eindtijd?: string | null } | null; spelers: SpelerOverzicht[] }) {
  // Uitgeschakelde spelers doen niet mee
  const spelers = alleSpelers.filter((s) => !s.uitgeschakeld);
  // Verspreide route: klopt het aantal teams waarvoor de startplekken zijn verdeeld?
  const verwacht = route?.modus === "verspreid" ? route.verwacht_aantal_teams ?? null : null;
  const aantalWijkt = verwacht !== null && spelers.length > 0 && spelers.length !== verwacht;
  const sleutel = `${VOORVOEGSEL}${route?.id ?? "geen"}`;
  const [handmatig, setHandmatig] = useState<Record<string, boolean>>({});
  // Alles klaar: ingeklapt tot één regel, tenzij je de stappen zelf weer openklapt
  const [toonStappen, setToonStappen] = useState(false);
  useEffect(() => {
    try { setHandmatig(JSON.parse(localStorage.getItem(sleutel) ?? "{}")); } catch { setHandmatig({}); }
    const leeg = () => setHandmatig({});
    window.addEventListener(LEEG_EVENT, leeg);
    return () => window.removeEventListener(LEEG_EVENT, leeg);
  }, [sleutel]);
  function wissel(id: string) {
    setHandmatig((h) => {
      const nieuw = { ...h, [id]: !h[id] };
      try { localStorage.setItem(sleutel, JSON.stringify(nieuw)); } catch { /* geen opslag */ }
      return nieuw;
    });
  }

  const ingelogd = spelers.filter((s) => s.ingelogd).length;
  const stappen: { id: string; titel: string; uitleg: string; klaar: boolean; auto: boolean; actie?: React.ReactNode }[] = [
    {
      id: "route", auto: true, klaar: !!route,
      titel: route ? `Route actief: ${route.name}` : "Activeer een route",
      uitleg: "Publiceren en activeren bij Routes.",
      actie: !route && <Link href="/admin/routes" className="rl-knop rl-knop--cyan">🗺️ Naar routes</Link>,
    },
    {
      id: "spelers", auto: true, klaar: spelers.length > 0,
      titel: spelers.length ? `${spelers.length} speler${spelers.length !== 1 ? "s" : ""} aangemaakt` : "Maak de spelers aan",
      uitleg: "Per team een loginnaam en wachtwoord.",
      actie: !spelers.length && <Link href="/admin/groepen" className="rl-knop rl-knop--cyan">👥 Naar spelers</Link>,
    },
    {
      id: "whatsapp", auto: false, klaar: !!handmatig.whatsapp,
      titel: "Inloggegevens verstuurd",
      uitleg: "Via WhatsApp in het menu.",
    },
    {
      id: "test", auto: false, klaar: !!handmatig.test,
      titel: "Zelf getest",
      uitleg: "Loop een stukje als testspeler.",
    },
    {
      id: "ingelogd", auto: true, klaar: spelers.length > 0 && ingelogd === spelers.length,
      titel: `Spelers ingelogd: ${ingelogd}/${spelers.length}`,
      uitleg: "Daarna kunnen ze op ‘Ga op pad’ drukken.",
    },
  ];
  const klaar = stappen.filter((s) => s.klaar).length;

  if (klaar === stappen.length && !toonStappen) {
    return (
      <div className="pr-gem-panel">
        <div className="pr-gem-panel-inner" style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span style={{ flex: 1, minWidth: 200, fontFamily: "var(--font-display)", fontWeight: 700, color: "#BBF7D0" }}>
            ✅ Alles klaar — wacht tot de spelers op ‘Ga op pad’ drukken
          </span>
          {route && <EindtijdKnop routeId={route.id} eindtijd={route.eindtijd} />}
          <button type="button" className="rl-knop" onClick={() => setToonStappen(true)}>Stappen tonen</button>
        {aantalWijkt && (
          <div className="klaar-waarschuwing">
            <span style={{ flex: 1, minWidth: 0 }}>
              ⚠️ <strong>{spelers.length} spelers</strong>, maar de route is ingesteld op <strong>{verwacht} teams</strong>.
              {" "}{spelers.length > (verwacht ?? 0) ? "Teams starten dan op dezelfde plek (de andere kant op)." : "Teams starten dan minder verspreid."}
            </span>
            {route && <Link href={`/admin/routes/${route.id}`} className="rl-knop">Aanpassen</Link>}
          </div>
        )}
        </div>
      </div>
    );
  }

  return (
    <div className="pr-gem-panel">
      <div className="pr-gem-panel-inner" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ flex: 1 }}>
            <div className="pr-gem-label">📋 Spel klaarzetten</div>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, color: "#fff" }}>{klaar} van {stappen.length} stappen klaar</div>
            {/* Eén keer uitleggen hoe je zelf afvinkt (i.p.v. bij elke stap) */}
            {stappen.some((s) => !s.auto && !s.klaar) && <div style={{ fontSize: "0.72rem", color: "var(--muted)" }}>Tik op een bolletje om een stap af te vinken.</div>}
          </div>
          {route && <EindtijdKnop routeId={route.id} eindtijd={route.eindtijd} />}
          {klaar === stappen.length && <button type="button" className="rl-knop" onClick={() => setToonStappen(false)}>Inklappen</button>}
        </div>
        <div className="pr-xp-bar" style={{ marginTop: 0 }}><div className="pr-xp-fill" style={{ width: `${(klaar / stappen.length) * 100}%` }} /></div>
        {stappen.map((s, i) => (
          <div key={s.id} className={`klaar-stap${s.klaar ? " klaar-stap--klaar" : ""}`}>
            {s.auto ? (
              <span className="klaar-vinkje" aria-hidden>{s.klaar ? "✓" : i + 1}</span>
            ) : (
              <button type="button" className="klaar-vinkje klaar-vinkje--knop" onClick={() => wissel(s.id)}
                aria-pressed={s.klaar} title={s.klaar ? "Weer op niet klaar zetten" : "Afvinken"}>
                {s.klaar ? "✓" : i + 1}
              </button>
            )}
            <div className="klaar-tekst" style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, color: "#fff", fontSize: "0.88rem" }}>{s.titel}</div>
              {!s.klaar && <div style={{ fontSize: "0.76rem", color: "var(--muted)" }}>{s.uitleg}</div>}
            </div>
            {!s.klaar && s.actie}
          </div>
        ))}
        {aantalWijkt && (
          <div className="klaar-waarschuwing">
            <span style={{ flex: 1, minWidth: 0 }}>
              ⚠️ <strong>{spelers.length} spelers</strong>, maar de route is ingesteld op <strong>{verwacht} teams</strong>.
              {" "}{spelers.length > (verwacht ?? 0) ? "Teams starten dan op dezelfde plek (de andere kant op)." : "Teams starten dan minder verspreid."}
            </span>
            {route && <Link href={`/admin/routes/${route.id}`} className="rl-knop">Aanpassen</Link>}
          </div>
        )}
      </div>
    </div>
  );
}
