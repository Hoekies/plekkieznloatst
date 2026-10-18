"use client";

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";

// Knop voor iets wat je niet per ongeluk wilt doen. Vervangt de confirm() van de browser.
// Standaard vraagt de eerste klik "Zeker?" met Ja/Nee op dezelfde plek; met `venster` opent
// er een venster midden in beeld met alleen een icoon, de titel en twee knoppen (vraag geldt dan niet).
export default function BevestigKnop({
  children, vraag, ja = "Ja", onBevestig, className = "btn btn-ghost", style, disabled, title,
  venster = false, titel, icoon, gevaarlijk = true, tip, tipOnder = false,
}: {
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
  tipOnder?: boolean;     // balkje onder de knop (knoppen bovenaan het scherm)
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

  const knop = <button type="button" className={className} style={style} disabled={disabled} title={tip ? undefined : title} data-tip={tip} data-tip-pos={tipOnder ? "onder" : undefined} aria-label={tip} onClick={() => setVragen(true)}>{children}</button>;

  if (venster) {
    return (
      <>
        {knop}
        {vragen && createPortal(
          <div onClick={() => !bezig && setVragen(false)} style={{
            position: "fixed", inset: 0, zIndex: 2500, background: "rgba(12,3,34,0.72)",
            display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
          }}>
            <div onClick={(e) => e.stopPropagation()} className="pr-gem-panel" style={{ flex: "none", width: "100%", maxWidth: 420, position: "relative" }}>
              <button type="button" className="editor-paneel-sluit venster-sluit" disabled={bezig} onClick={() => setVragen(false)} title="Annuleren" aria-label="Annuleren">✕</button>
              <div className="pr-gem-panel-inner" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, textAlign: "center", padding: "22px 20px 18px" }}>
                {icoon && <div style={{ fontSize: "2.6rem", lineHeight: 1 }}>{icoon}</div>}
                {titel && <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.25rem", color: "#fff" }}>{titel}</div>}
                <div style={{ display: "flex", gap: 10, marginTop: 6, flexWrap: "wrap", justifyContent: "center" }}>
                  <button type="button" className={`rl-knop ${gevaarlijk ? "rl-knop--rood" : "rl-knop--cyan"}`} style={{ height: 44, padding: "0 22px" }}
                    disabled={bezig} onClick={bevestig} autoFocus>
                    {bezig ? "Bezig…" : ja}
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
