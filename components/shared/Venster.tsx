"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";

// Esc sluit (alleen zolang `actief`, bijv. zolang een venster open staat)
export function useSluitMetEsc(onSluit: () => void, actief = true) {
  useEffect(() => {
    if (!actief) return;
    const toets = (e: KeyboardEvent) => { if (e.key === "Escape") onSluit(); };
    window.addEventListener("keydown", toets);
    return () => window.removeEventListener("keydown", toets);
  }, [onSluit, actief]);
}

// Venster in de stijl van de app: donkere achtergrond (tik ernaast = sluiten), paneel in het midden, Esc sluit.
// De inhoud (meestal een .pr-gem-panel-inner of een formulier) geeft de aanroeper zelf mee.
export default function Venster({ onSluit, breedte, maxHoogte, donker = 0.72, rand = 16, relatief = false, children }: {
  onSluit: () => void;
  breedte: number;            // maximale breedte in px
  maxHoogte?: number;         // maximale hoogte in vh (dan scrollt de inhoud)
  donker?: number;            // hoe donker de achtergrond is (0–1)
  rand?: number;              // ruimte rondom op een smal scherm (px)
  relatief?: boolean;         // voor een ✕ die met position: absolute in de hoek staat
  children: React.ReactNode;
}) {
  useSluitMetEsc(onSluit);
  if (typeof document === "undefined") return null;
  return createPortal(
    <div onClick={onSluit} className="venster-achter" style={{ background: `rgba(12,3,34,${donker})`, padding: rand }}>
      <div onClick={(e) => e.stopPropagation()} className="pr-gem-panel"
        style={{ flex: "none", width: "100%", maxWidth: breedte, ...(maxHoogte ? { maxHeight: `${maxHoogte}vh` } : {}), ...(relatief ? { position: "relative" } : {}) }}>
        {children}
      </div>
    </div>,
    document.body,
  );
}

// Kop van een venster: (icoon), klein label, titel, eventueel extra knoppen, en de rode ✕
export function VensterKop({ icoon, label, titel, onSluit, sluitLabel = "Sluiten", children }: {
  icoon?: string | null; label: React.ReactNode; titel: React.ReactNode; onSluit: () => void; sluitLabel?: string; children?: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      {icoon && <span className="pr-gem-avatar" style={{ width: 44, height: 44, fontSize: "1.6rem" }}>{icoon}</span>}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="pr-gem-label">{label}</div>
        <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.15rem", color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{titel}</div>
      </div>
      {children}
      <button type="button" className="editor-paneel-sluit" onClick={onSluit} title="Sluiten" aria-label={sluitLabel}>✕</button>
    </div>
  );
}

// Venster met een vaste kop (zie VensterKop); de inhoud eronder
export function VensterMetKop({ icoon, label, titel, onSluit, breedte, maxHoogte, children }: {
  icoon?: string | null; label: string; titel: string; onSluit: () => void; breedte: number; maxHoogte?: number; children: React.ReactNode;
}) {
  return (
    <Venster onSluit={onSluit} breedte={breedte} maxHoogte={maxHoogte}>
      <div className="pr-gem-panel-inner" style={{ display: "flex", flexDirection: "column", gap: 12, padding: "18px 18px 16px",
        ...(maxHoogte ? { maxHeight: `calc(${maxHoogte}vh - 6px)`, overflowY: "auto" } : {}) }}>
        <VensterKop icoon={icoon} label={label} titel={titel} onSluit={onSluit} />
        {children}
      </div>
    </Venster>
  );
}
