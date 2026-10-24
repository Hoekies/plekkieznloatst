import type { ReactNode } from "react";
import UitklapPijl from "@/components/shared/UitklapPijl";

const TITEL_STIJL = { fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "0.95rem", color: "#fff", textTransform: "uppercase", letterSpacing: "0.04em" } as const;

// Kop boven een lijst, zoals "👫 GROEPEN" op het dashboard; rechts eventueel knoppen.
// Met open en onWissel is het blok in te klappen: de kop wordt dan een knop met de uitklap-pijl.
export default function SectieKop({ titel, children, open, onWissel }: {
  titel: string; children?: ReactNode; open?: boolean; onWissel?: () => void;
}) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginBottom: 12 }}>
      {onWissel ? (
        <button type="button" onClick={onWissel} aria-expanded={open}
          style={{ ...TITEL_STIJL, flex: 1, minWidth: 80, display: "flex", alignItems: "center", gap: 8, padding: 0, border: 0, background: "none", cursor: "pointer", textAlign: "left" }}>
          <UitklapPijl open={!!open} />{titel}
        </button>
      ) : (
        <div style={{ ...TITEL_STIJL, flex: 1, minWidth: 80 }}>{titel}</div>
      )}
      {/* Knoppen mogen op een smal scherm krimpen en doorlopen naar een volgende regel */}
      {children && <div style={{ display: "flex", flexWrap: "wrap", gap: 6, minWidth: 0, maxWidth: "100%" }}>{children}</div>}
    </div>
  );
}
