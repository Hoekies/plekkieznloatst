"use client";

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";

// Knop voor iets wat je niet per ongeluk wilt doen. Vervangt de confirm() van de browser.
// Standaard vraagt de eerste klik "Zeker?" met Ja/Nee op dezelfde plek; met `venster` opent
// er een venster midden in beeld met alleen een icoon, de titel en twee knoppen (vraag geldt dan niet).
export default function BevestigKnop({
  children, vraag, ja = "Ja", onBevestig, className = "btn btn-ghost", style, disabled, title,
  venster = false, titel, icoon, gevaarlijk = true, tip, tipOnder = false, knopTekst, uitleg, sneltoets,
}: {
  // ⌨️ Toets die deze knop indrukt (zie components/admin/Sneltoetsen.tsx)
  sneltoets?: string;
  children: ReactNode;
  vraag: string;
  ja?: string;
  onBevestig: () => void | Promise<void>;
  className?: string;
  style?: CSSProperties;
  disabled?: boolean;
  title?: string;
  // Venster-variant
  venster?: boolean;
  titel?: string;
  icoon?: string;
  gevaarlijk?: boolean;   // rode bevestigknop (verwijderen); anders cyaan (bijv. kopiëren)
  tip?: string;           // info-balkje bij het aanwijzen (voor knoppen met alleen een icoon)
  // Venster: tekst op de knop. Standaard "Ja" (de titel zegt al wat er gebeurt); alleen invullen als
  // de knop iets extra's vertelt, zoals "Ja, naar de controle"
  knopTekst?: string;
  tipOnder?: boolean;     // balkje onder de knop (knoppen bovenaan het scherm)
  // Venster: één korte regel met het gevolg (bijv. "Kan niet ongedaan worden gemaakt"), alleen als dat nodig is
  uitleg?: string;
}) {
  const [vragen, setVragen] = useState(false);
  const [bezig, setBezig] = useState(false);

  // Inline: na een paar seconden zonder keuze terug naar de gewone knop. Venster: sluiten met Esc.
  useEffect(() => {
    if (!vragen) return;
    if (!venster) {
      const t = setTimeout(() => setVragen(false), 6000);
      return () => clearTimeout(t);
    }
    const toets = (e: KeyboardEvent) => { if (e.key === "Escape" && !bezig) setVragen(false); };
    window.addEventListener("keydown", toets);
    return () => window.removeEventListener("keydown", toets);
  }, [vragen, venster, bezig]);

  async function bevestig() {
    setBezig(true);
    try { await onBevestig(); } finally { setBezig(false); setVragen(false); }
  }

  const knop = <button type="button" className={className} style={style} disabled={disabled} title={tip ? undefined : title} data-tip={tip} data-tip-pos={tipOnder ? "onder" : undefined} aria-label={tip} data-sneltoets={sneltoets} onClick={() => setVragen(true)}>{children}</button>;

  if (venster) {
    return (
      <>
        {knop}
        {vragen && createPortal(
          <div onClick={() => !bezig && setVragen(false)} style={{
            position: "fixed", inset: 0, zIndex: 2500, background: "rgba(12,3,34,0.72)",
            display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
          }}>
            <div onClick={(e) => e.stopPropagation()} className="pr-gem-panel" style={{ flex: "none", width: "100%", maxWidth: 340, position: "relative" }}>
              <button type="button" className="editor-paneel-sluit venster-sluit" disabled={bezig} onClick={() => setVragen(false)} title="Annuleren" aria-label="Annuleren">✕</button>
              {/* Compact: icoon, titel (de vraag) en één knop; annuleren met het kruisje */}
              <div className="pr-gem-panel-inner" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, textAlign: "center", padding: "18px 44px 14px" }}>
                {/* Icoon in een rondje: rood bij iets dat niet terug kan, anders cyaan */}
                {icoon && <div className={`bevestig-icoon${gevaarlijk ? " bevestig-icoon--rood" : ""}`} aria-hidden>{icoon}</div>}
                {titel && <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.05rem", color: "#fff", lineHeight: 1.3 }}>{titel}</div>}
                {uitleg && <div style={{ fontSize: "0.8rem", color: "var(--muted)", lineHeight: 1.4 }}>{uitleg}</div>}
                <div style={{ display: "flex", gap: 12, marginTop: 4, flexWrap: "wrap", justifyContent: "center" }}>
                  <button type="button" className={`rl-knop ${gevaarlijk ? "rl-knop--rood" : "rl-knop--cyan"}`} style={{ height: 40, minWidth: 120, padding: "0 22px", justifyContent: "center", fontWeight: 800 }}
                    disabled={bezig} onClick={bevestig} autoFocus>
                    {bezig ? "Bezig…" : knopTekst ?? "Ja"}
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}
      </>
    );
  }

  if (!vragen) return knop;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, flexWrap: "wrap", fontSize: "0.78rem", color: "var(--text)" }}>
      <span style={{ fontWeight: 600 }}>{vraag}</span>
      <button type="button" className="rl-knop rl-knop--rood" style={{ height: 28, fontSize: "0.76rem" }} disabled={bezig} onClick={bevestig}>
        {bezig ? "Bezig…" : ja}
      </button>
      <button type="button" className="rl-knop" style={{ height: 28, fontSize: "0.76rem" }} onClick={() => setVragen(false)}>Nee</button>
    </span>
  );
}
