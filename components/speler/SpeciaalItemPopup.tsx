"use client";

import { useState } from "react";
import type { SpeciaalItem } from "@/types/database";
import { ITEM_INFO as UITLEG, type RouteWaarden } from "./SpeciaalItemLegende";

type Fase = "bevestig" | "kies_team" | "bezig" | "bevestigd" | "fout";

interface AndereSpeler {
  session_id: string;
  teamnaam: string;
  icon?: string | null;
  gefinisht?: boolean;
}

interface Props {
  item: SpeciaalItem;
  // Huidige plek van het team: het item komt op die plek in het verslag en op de routekaart
  plek?: { lat: number; lng: number } | null;
  waarden: RouteWaarden;
  andereSessies: AndereSpeler[];
  onVerwerkt: (itemId: string, eigenNotificatie?: string) => void;
  onSluit?: () => void;
  // 🪤 Een bom mag ook als verborgen val op de eigen plek (route-instelling, migratie 007)
  valMag?: boolean;
}

// Naam en een heldere accentkleur per item (goed leesbaar op de donkere achtergrond)
const ITEM_INFO: Record<string, { kleur: string; label: string }> = {
  spook:        { kleur: "#C4B5FD", label: "Spook" },
  bom:          { kleur: "#FCA5A5", label: "Bom" },
  ster:         { kleur: "#FDE68A", label: "Ster" },
  verdubbeling: { kleur: "#FCA5A5", label: "Verdubbeling" },
  wissel:       { kleur: "#93C5FD", label: "Wissel" },
  dief:         { kleur: "#FDBA74", label: "Dief" },
  radar:        { kleur: "#7DD3FC", label: "Radar" },
  banaan:       { kleur: "#FDE68A", label: "Banaan" },
  plekzooi:     { kleur: "#FCA5A5", label: "Plek zooi" },
  vraagteken:   { kleur: "#C4B5FD", label: "Vraagteken" },
  schaduw:      { kleur: "#CBD5E1", label: "Schaduw" },
};

const TYPES_ZONDER_DOEL = new Set(["ster", "verdubbeling", "radar", "vraagteken", "schaduw"]);

// Korte uitleg in het venster (de lange staat bij de i-knop)
function minuten(sec: number) {
  const m = Math.round((sec / 60) * 2) / 2;
  return sec < 60 ? `${sec} sec` : `${String(m).replace(".", ",")} min`;
}
function kortUitleg(type: string, w: RouteWaarden): string {
  switch (type) {
    case "ster": return `${w.ster} punten erbij.`;
    case "verdubbeling": return "Je volgende goede vraag telt dubbel.";
    case "radar": return "2 minuten lang zie je alle teams.";
    case "bom": return `Het team verliest ${w.bom} punten.`;
    case "spook": return `Hun volgende punt is ${minuten(w.spookSec)} weg.`;
    case "dief": return "Steel de punten van een goede vraag.";
    case "banaan": return "Hun volgende twee punten ruilen van plek.";
    case "wissel": return "Ruil jullie score met een ander team.";
    case "vraagteken": return "Een gok: punten erbij of eraf.";
    case "schaduw": return "Even onzichtbaar voor radar en duels.";
    default: return "";
  }
}

// Kort: wat er gebeurd is na het gebruiken
function gelukt(type: string) {
  return type === "ster" ? "Punten erbij!"
    : type === "verdubbeling" ? "Verdubbeling actief!"
    : type === "radar" ? "Radar 2 minuten aan!"
    : type === "vraagteken" ? "Het lot heeft gesproken! 🎲"
    : type === "schaduw" ? "Jullie zijn onzichtbaar 🥷"
    : "Raak!";
}

export default function SpeciaalItemPopup({ item, plek, waarden, andereSessies, onVerwerkt, onSluit, valMag = false }: Props) {
  const startFase: Fase = TYPES_ZONDER_DOEL.has(item.type) ? "bevestig" : "kies_team";
  const [fase, setFase] = useState<Fase>(startFase);
  const [foutMelding, setFoutMelding] = useState("");

  const info = ITEM_INFO[item.type] ?? { kleur: "#FFFFFF", label: item.type };
  const beschrijving = kortUitleg(item.type, waarden) || (UITLEG[item.type]?.beschrijving(waarden) ?? "");
  const later = () => (onSluit ? onSluit() : onVerwerkt(item.id));
  const [valGezet, setValGezet] = useState<number | null>(null);

  // 🪤 De bom als val op deze plek: alleen jullie zien hem, wie er binnen 15 meter langs loopt verliest punten
  async function legVal() {
    if (!plek) { setFoutMelding("Je locatie ontbreekt: zet je locatie aan"); setFase("fout"); return; }
    setFase("bezig");
    const res = await fetch("/api/speler/val", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ special_item_id: item.id, latitude: plek.lat, longitude: plek.lng }),
    }).catch(() => null);
    const data = res ? await res.json().catch(() => ({})) : {};
    if (!res?.ok) { setFoutMelding(data.fout ?? "Geen verbinding. Probeer het opnieuw."); setFase("fout"); return; }
    setValGezet(typeof data.minuten === "number" ? data.minuten : 20);
    setFase("bevestigd");
    setTimeout(() => onVerwerkt(item.id), 3000);
  }

  async function pasEffectToe(targetSessionId?: string) {
    setFase("bezig");
    try {
      const body: Record<string, string | number> = { special_item_id: item.id };
      if (targetSessionId) body.target_session_id = targetSessionId;
      if (plek) { body.latitude = plek.lat; body.longitude = plek.lng; }

      const res = await fetch("/api/speler/speciaal/effect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setFoutMelding(data.fout ?? "Er ging iets mis.");
        setFase("fout");
        return;
      }
      setFase("bevestigd");
      setTimeout(() => onVerwerkt(item.id, data.eigen_notificatie ?? undefined), 3000);
    } catch {
      setFoutMelding("Geen verbinding. Probeer het opnieuw.");
      setFase("fout");
    }
  }

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 500,
      background: "rgba(12,3,34,0.78)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
    }}>
      <div className="pr-panel" style={{ maxWidth: 340, width: "100%" }}>
        <div className="pr-panel-inner" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, textAlign: "center", paddingTop: 22 }}>
          {/* Het item zelf, groot */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/items/${item.type}.webp`} alt="" style={{ width: 96, height: 96, filter: "drop-shadow(0 6px 16px rgba(0,0,0,0.55))" }} />
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.45rem", color: info.kleur, lineHeight: 1.1 }}>{info.label}</div>
          {beschrijving && fase !== "bevestigd" && (
            <p style={{ margin: 0, fontSize: "0.86rem", color: "rgba(255,255,255,0.78)", lineHeight: 1.4 }}>{beschrijving}</p>
          )}

          {/* Zonder doel: meteen gebruiken of bewaren */}
          {fase === "bevestig" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%", marginTop: 4 }}>
              <button className="btn-premium--compact" onClick={() => pasEffectToe()}>GEBRUIKEN!</button>
              <button type="button" className="item-later" onClick={later}>Later</button>
            </div>
          )}

          {/* Met doel: kies een team */}
          {fase === "kies_team" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%", marginTop: 4 }}>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "0.95rem", color: "#fff" }}>Kies een team</div>
              {andereSessies.length === 0 ? (
                <p style={{ margin: 0, fontSize: "0.86rem", color: "rgba(255,255,255,0.7)" }}>Er speelt nu geen ander team.</p>
              ) : andereSessies.map((s) => (
                <button key={s.session_id} type="button" className="item-team" style={{ borderColor: info.kleur }} onClick={() => pasEffectToe(s.session_id)}>
                  {/* Icoon van het team, zodat je in één oogopslag ziet wie je kiest */}
                  {s.icon && <span aria-hidden style={{ fontSize: "1.6rem", lineHeight: 1 }}>{s.icon}</span>}
                  <span>{s.teamnaam}{s.gefinisht && " 🏁"}</span>
                </button>
              ))}
              {valMag && item.type === "bom" && (
                <button type="button" className="item-team item-val" onClick={legVal}>
                  <span aria-hidden style={{ fontSize: "1.6rem", lineHeight: 1 }}>🪤</span>
                  <span>Hier neerleggen als val</span>
                </button>
              )}
              <button type="button" className="item-later" onClick={later}>Later</button>
            </div>
          )}

          {fase === "bezig" && <p style={{ margin: 0, color: "rgba(255,255,255,0.75)" }}>Bezig…</p>}

          {fase === "bevestigd" && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <div style={{ fontSize: "2.4rem", lineHeight: 1 }}>✅</div>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.15rem", color: "#86EFAC" }}>{valGezet !== null ? `Val gezet! 🪤 ${valGezet} minuten scherp` : gelukt(item.type)}</div>
            </div>
          )}

          {fase === "fout" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%" }}>
              <p style={{ margin: 0, color: "#FCA5A5", fontWeight: 700 }}>{foutMelding}</p>
              <button className="btn-premium--compact" onClick={() => setFase(startFase)}>OPNIEUW</button>
              <button type="button" className="item-later" onClick={later}>Later</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
