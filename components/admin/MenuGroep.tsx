"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";

// ⚙️ Groep in het menu (bijv. Instellingen): klapt als paneel naar rechts uit, naast het menu, zodat het menu
// zelf niet langer wordt. Dicht bij een keuze, een tik ernaast of Esc. Staat de pagina waar je bent in de
// groep, dan licht de knop op.
export default function MenuGroep({ icoon, titel, paden, children }: {
  icoon: React.ReactNode; titel: string; paden: string[]; children: React.ReactNode;
}) {
  const pad = usePathname();
  const knop = useRef<HTMLButtonElement>(null);
  const paneel = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [plek, setPlek] = useState<{ left: number; top: number } | null>(null);
  const [klaar, setKlaar] = useState(false);
  useEffect(() => setKlaar(true), []);
  useEffect(() => setOpen(false), [pad]);
  const hier = paden.some((p) => pad === p || pad.startsWith(p + "/"));

  // Naast de knop, en binnen het scherm
  useLayoutEffect(() => {
    if (!open) return;
    function zet() {
      const r = knop.current?.getBoundingClientRect();
      if (!r) return;
      const h = paneel.current?.offsetHeight ?? 0, b = paneel.current?.offsetWidth ?? 0;
      setPlek({ left: Math.max(8, Math.min(r.right + 8, window.innerWidth - b - 8)), top: Math.max(8, Math.min(r.top, window.innerHeight - h - 8)) });
    }
    zet();
    window.addEventListener("resize", zet);
    window.addEventListener("scroll", zet, true);
    return () => { window.removeEventListener("resize", zet); window.removeEventListener("scroll", zet, true); };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function buiten(e: MouseEvent) {
      const t = e.target as Node;
      if (!paneel.current?.contains(t) && !knop.current?.contains(t)) setOpen(false);
    }
    function esc(e: KeyboardEvent) { if (e.key === "Escape") setOpen(false); }
    document.addEventListener("mousedown", buiten);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", buiten); document.removeEventListener("keydown", esc); };
  }, [open]);

  return (
    <>
      <button ref={knop} type="button" className={`admin-nav-link menu-groep-kop${hier ? " actief" : ""}${open ? " menu-groep-kop--open" : ""}`}
        onClick={() => setOpen((o) => !o)} aria-expanded={open} title={titel}>
        {icoon} {titel}<i className="menu-groep-pijl" />
      </button>
      {/* Het paneel blijft bestaan als het dicht is (alleen verborgen), zodat een venster dat een knop erin
          opent (bijv. 🔔 Meldingen) open blijft */}
      {klaar && createPortal(
        <div ref={paneel} className="menu-groep-uitklap" hidden={!open} role="menu" aria-label={titel}
          style={plek ? { left: plek.left, top: plek.top } : undefined}
          onClick={(e) => { if ((e.target as HTMLElement).closest(".admin-nav-link")) setOpen(false); }}>
          <div className="menu-groep-titel">{titel}</div>
          {children}
        </div>,
        document.body,
      )}
    </>
  );
}
