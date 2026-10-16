"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

// Goudomrande tegel met een getal of naam, zoals bovenaan het dashboard.
// Past de waarde niet (bijv. een lange routenaam), dan schuift de tekst heen en weer.
export default function StatKaart({ label, waarde, badge, badgeKlas }: { label: string; waarde: string; badge: string; badgeKlas: string }) {
  const vakRef = useRef<HTMLDivElement>(null);
  const tekstRef = useRef<HTMLSpanElement>(null);
  const [teLang, setTeLang] = useState(0);

  useEffect(() => {
    const vak = vakRef.current, tekst = tekstRef.current;
    if (!vak || !tekst) return;
    const meet = () => setTeLang(Math.max(0, Math.ceil(tekst.scrollWidth - vak.clientWidth)));
    meet();
    const ro = new ResizeObserver(meet);
    ro.observe(vak);
    return () => ro.disconnect();
  }, [waarde]);

  // Snelheid gelijk houden: ongeveer 40 pixels per seconde, met pauzes aan beide kanten
  const stijl = teLang > 0
    ? ({ "--schuif": `-${teLang}px`, animationDuration: `${Math.max(4, teLang / 40 + 3)}s` } as CSSProperties)
    : undefined;

  return (
    <div className="pr-gem-panel">
      <span className={`pr-corner-chip pr-badge ${badgeKlas}`}>{badge}</span>
      <div className="pr-gem-panel-inner">
        <div className="pr-gem-label">{label}</div>
        <div ref={vakRef} className="pr-gem-value" style={{ textOverflow: "clip" }} title={teLang > 0 ? waarde : undefined}>
          <span ref={tekstRef} className={teLang > 0 ? "stat-schuif" : undefined} style={{ display: "inline-block", ...stijl }}>{waarde}</span>
        </div>
      </div>
    </div>
  );
}
