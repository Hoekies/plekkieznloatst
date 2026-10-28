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

// Maximale hoogte van een venster: procent van het ZICHTBARE scherm (dvh; vh is op de iPhone hoger dan wat je
// ziet) en nooit onder de statusbalk/notch of de thuisbalk. aftrek = px eraf (rand van het paneel).
export function vensterHoogte(procent: number, aftrek = 0): string {
  return `min(calc(${procent}dvh - ${aftrek}px), calc(100dvh - env(safe-area-inset-top) - env(safe-area-inset-bottom) - ${24 + aftrek}px))`;
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
    // Rand rondom, maar boven en onder minstens vrij van de statusbalk en de thuisbalk (iPhone)
    <div onClick={onSluit} className="venster-achter" style={{ background: `rgba(12,3,34,${donker})`,
      padding: `max(${rand}px, calc(env(safe-area-inset-top) + 8px)) ${rand}px max(${rand}px, calc(env(safe-area-inset-bottom) + 8px))` }}>
      <div onClick={(e) => e.stopPropagation()} className="pr-gem-panel"
        style={{ flex: "none", width: "100%", maxWidth: breedte, ...(maxHoogte ? { maxHeight: vensterHoogte(maxHoogte) } : {}), ...(relatief ? { position: "relative" } : {}) }}>
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
        ...(maxHoogte ? { maxHeight: vensterHoogte(maxHoogte, 6), overflowY: "auto" } : {}) }}>
        <VensterKop icoon={icoon} label={label} titel={titel} onSluit={onSluit} />
        {children}
      </div>
    </Venster>
  );
}
