"use client";

import { useEffect } from "react";

// ⌨️ Sneltoetsen in het beheer (pc): ? of H = hulp, B = bericht sturen, P = pauze / verder.
// Een knop doet mee met data-sneltoets="b"; de toets drukt de zichtbare knop in (bij pauze eerst het
// bevestigvenster). Niet tijdens het typen in een veld, en niet met Ctrl/Alt/⌘ erbij.
export default function Sneltoetsen() {
  useEffect(() => {
    function toets(e: KeyboardEvent) {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const doel = e.target as HTMLElement | null;
      if (doel && (doel.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(doel.tagName))) return;
      const k = e.key === "h" || e.key === "H" ? "?" : e.key.toLowerCase();
      const knop = [...document.querySelectorAll<HTMLElement>(`[data-sneltoets="${CSS.escape(k)}"]`)].find((el) => el.getClientRects().length);
      if (!knop) return;
      e.preventDefault();
      knop.click();
    }
    window.addEventListener("keydown", toets);
    return () => window.removeEventListener("keydown", toets);
  }, []);
  return null;
}
