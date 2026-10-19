"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { SpelerOverzicht } from "@/lib/admin-live";
import BevestigKnop from "@/components/admin/BevestigKnop";
import { toonMelding } from "@/components/admin/Melding";
import EindtijdKnop, { resterend } from "@/components/admin/EindtijdKnop";
import { uitlegBijStatus } from "@/lib/fout-uitleg";

// Na zoveel minuten zonder locatie-update vragen we aandacht voor een speler
export const NIET_GEZIEN_MIN = 5;

// Minuten leesbaar: "12 min", "3 u 5 min", "2 d 4 u"
export function duurKort(min: number): string {
  if (min < 60) return `${min} min`;
  if (min < 1440) return `${Math.floor(min / 60)} u${min % 60 ? ` ${min % 60} min` : ""}`;
  const u = Math.floor((min % 1440) / 60);
  return `${Math.floor(min / 1440)} d${u ? ` ${u} u` : ""}`;
}

export function minutenNietGezien(s: SpelerOverzicht, nu = Date.now()): number | null {
  if (s.sessie_status !== "actief") return null;
  const sinds = s.laatste_gezien ?? s.started_at;
  if (!sinds) return null;
  const min = Math.floor((nu - new Date(sinds).getTime()) / 60000);
  return min >= NIET_GEZIEN_MIN ? min : null;
}

function duur(ms: number): string {
  const min = Math.max(0, Math.floor(ms / 60000));
  return min < 60 ? `${min} min` : `${Math.floor(min / 60)}:${String(min % 60).padStart(2, "0")} uur`;
}

// "Spelleider": hoe lang het spel loopt, wat nu je aandacht vraagt, en het spel afronden
export default function SpelLeider({ spelend, wachtendeFotos, kleuren, uitslagVrij, onKies, routeId, eindtijd, pauze = null, beperkt = false }: {
  spelend: SpelerOverzicht[];
  wachtendeFotos: number;
  kleuren: Map<string, string>;
  uitslagVrij?: boolean;
  onKies: (s: SpelerOverzicht) => void;
  routeId?: string;
  eindtijd?: string | null;
  // Gepauzeerd sinds (null = het spel loopt)
  pauze?: string | null;
  // Hulp (helper): geen eindtijd en niet afronden
  beperkt?: boolean;
}) {
  // Elke halve minuut opnieuw tekenen, zodat "speelt sinds" en "niet gezien" meelopen
  const [nu, setNu] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setNu(Date.now()), 30000); return () => clearInterval(t); }, []);

  const start = spelend.map((s) => s.started_at).filter((t): t is string => !!t).sort()[0];
  const onderweg = spelend.filter((s) => s.sessie_status === "actief").length;

  const aandacht: { id: string; kleur: string | null; tekst: string; speler?: SpelerOverzicht; link?: string }[] = [];
  for (const s of spelend) {
    if (s.hulp) aandacht.push({ id: `hulp-${s.player_id}`, kleur: "#FF8A00", tekst: `⚠️ ${s.display_name} kan ${s.hulp.punt_naam ? `"${s.hulp.punt_naam}"` : "het volgende punt"} niet bereiken`, speler: s });
  }
  for (const s of spelend) {
    if (s.wacht && new Date(s.wacht.tot).getTime() > nu) {
      const min = Math.ceil((new Date(s.wacht.tot).getTime() - nu) / 60000);
      aandacht.push({ id: `wacht-${s.player_id}`, kleur: "#A78BFA", tekst: `${s.wacht.soort === "spook" ? "👻" : "⛔"} ${s.display_name} moet wachten (${s.wacht.soort === "spook" ? "spook" : "plek zooi"}, nog ± ${min} min)`, speler: s });
    }
  }
  if (wachtendeFotos > 0) aandacht.push({ id: "fotos", kleur: "#FBBF24", tekst: `📸 ${wachtendeFotos} foto${wachtendeFotos !== 1 ? "'s" : ""} te keuren`, link: "/admin/antwoorden" });
  const stil = spelend.filter((s) => minutenNietGezien(s, nu) !== null);
  if (stil.length === 1) {
    const s = stil[0];
    aandacht.push({ id: "stil", kleur: "#9CA3AF", tekst: `📵 ${s.display_name} ${duurKort(minutenNietGezien(s, nu)!)} niet gezien${s.ingelogd ? "" : " (uitgelogd)"}`, speler: s });
  } else if (stil.length > 1) {
    aandacht.push({ id: "stil", kleur: "#9CA3AF", tekst: `📵 ${stil.length} teams een tijd niet gezien: ${stil.map((s) => s.display_name).join(", ")}` });
  }

  // ⏸️ Pauze: alle teams staan stil; ▶️ Verder: de eindtijd schuift mee
  const [pauzeLokaal, setPauzeLokaal] = useState<string | null | undefined>(undefined);
  useEffect(() => { setPauzeLokaal(undefined); }, [pauze]);
  const gepauzeerd = pauzeLokaal !== undefined ? pauzeLokaal : pauze;
  async function wisselPauze(aan: boolean) {
    const res = await fetch("/api/admin/pauze", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pauze: aan }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { toonMelding(uitlegBijStatus(res.status, "Pauzeren", data.fout), "fout"); return; }
    setPauzeLokaal(data.pauze ?? null);
    toonMelding(aan ? "Spel gepauzeerd: alle teams zien het pauzescherm" : "Het spel gaat verder", "ok");
  }

  async function afronden() {
    // Rapport meteen openen (een venster openen mag alleen direct na de klik)
    window.open("/admin/rapport", "_blank");
    const res = await fetch("/api/admin/uitslag", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ vrij: true }),
    }).catch(() => null);
    toonMelding(res?.ok ? "Uitslag vrijgegeven: iedereen ziet de eindstand" : uitlegBijStatus(res?.status ?? 0, "Uitslag vrijgeven"), res?.ok ? "ok" : "fout");
  }

  return (
    <div className="pr-gem-panel spelleider">
      <div className="pr-gem-panel-inner" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {/* Status links, knoppen rechts; op de telefoon de knoppen op een eigen regel eronder */}
        <div className="spelleider-kop">
          <div className="spelleider-status">
            <div className="pr-gem-label">🎯 Spelleider</div>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, color: "#fff", fontSize: "1rem" }}>
              {start ? `Speelt sinds ${duur(nu - new Date(start).getTime())}` : "Spel loopt"} · {onderweg} onderweg
              {eindtijd && new Date(eindtijd).getTime() > nu && <span style={{ color: "#FFE680" }}> · nog {resterend(eindtijd, nu)}</span>}
            </div>
          </div>
          {!beperkt && (
            <div className="spelleider-knoppen">
              {gepauzeerd ? (
                <button type="button" className="rl-knop rl-knop--groen actie-knop" onClick={() => wisselPauze(false)}>▶️ Verder</button>
              ) : (
                <BevestigKnop venster gevaarlijk={false} icoon="⏸️" titel="Spel pauzeren?"
                  vraag="Alle teams zien een pauzescherm en kunnen even niets doen. De eindtijd loopt niet door." ja="Ja, pauzeren"
                  onBevestig={() => wisselPauze(true)} className="rl-knop actie-knop">⏸️ Pauze</BevestigKnop>
              )}
              {routeId && <EindtijdKnop routeId={routeId} eindtijd={eindtijd} />}
              {/* Afronden: uitslag vrijgeven en het rapport openen, in één keer */}
              <BevestigKnop venster gevaarlijk={false} icoon="🏁"
                titel={onderweg ? `Spel afronden? (${onderweg} nog onderweg)` : "Spel afronden?"}
                vraag="" ja="Ja, uitslag vrijgeven en rapport openen" knopTekst="Ja, uitslag vrijgeven" onBevestig={afronden}
                className="rl-knop rl-knop--cyan actie-knop">
                🏁 {uitslagVrij ? "Rapport openen" : "Spel afronden"}
              </BevestigKnop>
            </div>
          )}
        </div>

        {gepauzeerd && (
          <div className="spelleider-regel spelleider-pauze">
            ⏸️ <strong>Gepauzeerd</strong> sinds {new Date(gepauzeerd).toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" })} · {duur(nu - new Date(gepauzeerd).getTime())}
          </div>
        )}
        {aandacht.length === 0 ? (
          <div className="spelleider-regel" style={{ borderLeftColor: "#4ADE80", color: "#BBF7D0" }}>✅ Alles loopt, niets vraagt je aandacht</div>
        ) : aandacht.map((a) => {
          const inhoud = <><span style={{ flex: 1, minWidth: 0 }}>{a.tekst}</span><span aria-hidden style={{ color: "var(--muted)" }}>›</span></>;
          const stijl = { borderLeftColor: (a.speler && kleuren.get(a.speler.player_id)) || a.kleur || undefined };
          return a.link
            ? <Link key={a.id} href={a.link} className="spelleider-regel spelleider-regel--knop" style={stijl}>{inhoud}</Link>
            : <button key={a.id} type="button" className="spelleider-regel spelleider-regel--knop" style={stijl} onClick={() => a.speler && onKies(a.speler)}>{inhoud}</button>;
        })}
      </div>
    </div>
  );
}
