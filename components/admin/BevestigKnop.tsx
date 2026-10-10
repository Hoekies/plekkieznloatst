"use client";

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";

// Knop voor iets wat je niet per ongeluk wilt doen: de eerste klik vraagt "Zeker?",
// met Ja/Nee op dezelfde plek. Vervangt de confirm() van de browser.
export default function BevestigKnop({ children, vraag, ja = "Ja", onBevestig, className = "btn btn-ghost", style, disabled, title }: {
  children: ReactNode;
  vraag: string;
  ja?: string;
  onBevestig: () => void | Promise<void>;
  className?: string;
  style?: CSSProperties;
  disabled?: boolean;
  title?: string;
}) {
  const [vragen, setVragen] = useState(false);
  const [bezig, setBezig] = useState(false);
  // Na een paar seconden zonder keuze terug naar de gewone knop
  useEffect(() => {
    if (!vragen) return;
    const t = setTimeout(() => setVragen(false), 6000);
    return () => clearTimeout(t);
  }, [vragen]);

  if (!vragen) {
    return <button type="button" className={className} style={style} disabled={disabled} title={title} onClick={() => setVragen(true)}>{children}</button>;
  }
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, flexWrap: "wrap", fontSize: "0.78rem", color: "var(--text)" }}>
      <span style={{ fontWeight: 600 }}>{vraag}</span>
      <button type="button" className="rl-knop rl-knop--rood" style={{ height: 28, fontSize: "0.76rem" }} disabled={bezig}
        onClick={async () => { setBezig(true); try { await onBevestig(); } finally { setBezig(false); setVragen(false); } }}>
        {bezig ? "Bezig…" : ja}
      </button>
      <button type="button" className="rl-knop" style={{ height: 28, fontSize: "0.76rem" }} onClick={() => setVragen(false)}>Nee</button>
    </span>
  );
}
