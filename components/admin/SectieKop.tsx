import type { ReactNode } from "react";

// Kop boven een lijst, zoals "👥 GROEPEN" op het dashboard; rechts eventueel knoppen
export default function SectieKop({ titel, children }: { titel: string; children?: ReactNode }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginBottom: 12 }}>
      <div style={{ flex: 1, minWidth: 80, fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "0.95rem", color: "#fff", textTransform: "uppercase", letterSpacing: "0.04em" }}>
        {titel}
      </div>
      {children && <div style={{ display: "flex", flexWrap: "wrap", gap: 6, flexShrink: 0 }}>{children}</div>}
    </div>
  );
}
