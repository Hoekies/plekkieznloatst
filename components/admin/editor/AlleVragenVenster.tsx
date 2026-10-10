"use client";

import { useEffect, useState } from "react";
import type { RoutePunt } from "@/types/database";
import VraagEditorPagina, { type VraagMetAntwoorden } from "../VraagEditorPagina";
import type { KaartPunt } from "../PuntMiniKaart";

// Alle vragen achter elkaar invullen: links de vraagpunten, rechts de gewone vraag-editor.
// Na "Opslaan & volgende" gaat het venster door naar het volgende punt.
export default function AlleVragenVenster({ routeId, punten, kaartPunten, nummer, heeftVraag, onBijgewerkt, onSluit }: {
  routeId: string;
  kaartPunten: KaartPunt[];              // alle punten van de route, voor het kaartje
  punten: RoutePunt[];                   // de vraagpunten, in routevolgorde
  nummer: (p: RoutePunt) => string;      // zelfde nummer als op de kaart
  heeftVraag: (id: string) => boolean;
  onBijgewerkt: (puntId: string, vraag: VraagMetAntwoorden | null) => void;
  onSluit: () => void;
}) {
  // Begin bij het eerste punt zonder vraag
  const [index, setIndex] = useState(() => Math.max(0, punten.findIndex((p) => !heeftVraag(p.id))));
  const [vraag, setVraag] = useState<VraagMetAntwoorden | null | undefined>(undefined);
  const punt = punten[index];
  const puntId = punt?.id;

  useEffect(() => {
    if (!puntId) return;
    let actief = true;
    setVraag(undefined);
    fetch(`/api/admin/routes/${routeId}/punten/${puntId}/vraag`)
      .then((r) => (r.ok ? r.json() : null))
      .then((v) => { if (actief) setVraag(v ?? null); })
      .catch(() => { if (actief) setVraag(null); });
    return () => { actief = false; };
  }, [routeId, puntId]);

  const klaar = punten.filter((p) => heeftVraag(p.id)).length;

  return (
    <div data-vraagvenster style={{ position: "fixed", inset: 0, zIndex: 2000, background: "var(--bg)", display: "flex" }}>
      {/* Lijst met alle vraagpunten */}
      <aside style={{ width: 230, flexShrink: 0, borderRight: "1px solid var(--line)", display: "flex", flexDirection: "column", background: "rgba(8,28,48,0.6)" }}>
        <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, color: "var(--ink)" }}>📝 Alle vragen</div>
            <div style={{ fontSize: "0.74rem", color: "var(--muted)" }}>{klaar} van {punten.length} ingevuld</div>
          </div>
          <button type="button" className="editor-paneel-sluit" onClick={onSluit} title="Sluiten">✕</button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "6px 0" }}>
          {punten.map((p, i) => (
            <button key={p.id} type="button" onClick={() => setIndex(i)}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "7px 12px", border: "none", cursor: "pointer", textAlign: "left",
                background: i === index ? "rgba(0,217,255,0.14)" : "transparent",
                borderLeft: `3px solid ${i === index ? "var(--cyan)" : "transparent"}`, color: "var(--ink)",
              }}>
              <span style={{ width: 24, height: 24, borderRadius: "50%", flexShrink: 0, background: "var(--blue)", color: "#fff", fontSize: "0.72rem", fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {nummer(p)}
              </span>
              <span style={{ flex: 1, minWidth: 0, fontSize: "0.82rem", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</span>
              <span title={heeftVraag(p.id) ? "Heeft een vraag" : "Nog geen vraag"}>{heeftVraag(p.id) ? "✅" : "⚠️"}</span>
            </button>
          ))}
        </div>
      </aside>

      {/* Vraag van het gekozen punt */}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", borderBottom: "1px solid var(--line)", fontSize: "0.8rem", color: "var(--muted)" }}>
          <button type="button" className="rl-knop" style={{ height: 30 }} disabled={index === 0} onClick={() => setIndex(index - 1)}>← Vorige</button>
          <span style={{ flex: 1, textAlign: "center" }}>Punt {index + 1} van {punten.length}</span>
          <button type="button" className="rl-knop" style={{ height: 30 }} disabled={index >= punten.length - 1} onClick={() => setIndex(index + 1)}>Overslaan →</button>
        </div>
        <div style={{ flex: 1, minHeight: 0 }}>
          {!punt ? null : vraag === undefined ? (
            <p style={{ padding: 28, color: "var(--muted)" }}>Laden…</p>
          ) : (
            <VraagEditorPagina key={punt.id} routeId={routeId} punt={punt} bestaandeVraag={vraag} kaartPunten={kaartPunten}
              opslaanLabel={index < punten.length - 1 ? "Opslaan & volgende →" : "Opslaan & klaar"}
              onSluit={(v) => {
                if (v === undefined) { onSluit(); return; }
                onBijgewerkt(punt.id, v);
                if (v === null) { setVraag(null); return; }       // verwijderd: blijf op dit punt
                if (index < punten.length - 1) setIndex(index + 1); else onSluit();
              }} />
          )}
        </div>
      </div>
    </div>
  );
}
