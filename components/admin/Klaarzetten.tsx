"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { SpelerOverzicht } from "@/lib/admin-live";
import WhatsAppKnop from "@/components/admin/WhatsAppKnop";

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
export default function Klaarzetten({ route, spelers }: { route: { id: string; name: string } | null; spelers: SpelerOverzicht[] }) {
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
      titel: route ? `Route actief: ${route.name}` : "Kies en activeer een route",
      uitleg: "Op de pagina Routes: publiceer de route en druk op Activeren.",
      actie: !route && <Link href="/admin/routes" className="rl-knop rl-knop--cyan">🗺️ Naar routes</Link>,
    },
    {
      id: "spelers", auto: true, klaar: spelers.length > 0,
      titel: spelers.length ? `${spelers.length} speler${spelers.length !== 1 ? "s" : ""} aangemaakt` : "Maak de spelers aan",
      uitleg: "Op de pagina Spelers: per team een loginnaam en wachtwoord.",
      actie: !spelers.length && <Link href="/admin/groepen" className="rl-knop rl-knop--cyan">👥 Naar spelers</Link>,
    },
    {
      id: "whatsapp", auto: false, klaar: !!handmatig.whatsapp,
      titel: "Inloggegevens en uitleg verstuurd",
      uitleg: "Via WhatsApp: de link, de uitleg om de app op het beginscherm te zetten en de handleiding.",
      actie: <WhatsAppKnop />,
    },
    {
      id: "test", auto: false, klaar: !!handmatig.test,
      titel: "Zelf getest",
      uitleg: "Log in als testspeler en loop een stukje: komen punten en vragen goed binnen?",
    },
    {
      id: "ingelogd", auto: true, klaar: spelers.length > 0 && ingelogd === spelers.length,
      titel: `Spelers ingelogd: ${ingelogd}/${spelers.length}`,
      uitleg: "Zodra iedereen is ingelogd, kunnen ze op ‘Ga op pad’ drukken.",
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
          <button type="button" className="rl-knop" onClick={() => setToonStappen(true)}>Stappen tonen</button>
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
          </div>
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
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, color: "#fff", fontSize: "0.88rem" }}>{s.titel}</div>
              {!s.klaar && <div style={{ fontSize: "0.76rem", color: "var(--muted)" }}>{s.uitleg}{!s.auto && " Tik op het bolletje als het klaar is."}</div>}
            </div>
            {!s.klaar && s.actie}
          </div>
        ))}
      </div>
    </div>
  );
}
