"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

// Tekst op één regel. Past hij niet, dan schuift hij rustig heen en weer (met een pauze aan beide kanten).
// Gebruikt voor lange namen in tegels en routekaarten.
export default function SchuifTekst({ tekst, className, style }: { tekst: string; className?: string; style?: CSSProperties }) {
  const vakRef = useRef<HTMLSpanElement>(null);
  const tekstRef = useRef<HTMLSpanElement>(null);
  const [teLang, setTeLang] = useState(0);

  useEffect(() => {
    const vak = vakRef.current, binnen = tekstRef.current;
    if (!vak || !binnen) return;
    const meet = () => setTeLang(Math.max(0, Math.ceil(binnen.scrollWidth - vak.clientWidth)));
    meet();
    const ro = new ResizeObserver(meet);
    ro.observe(vak);
    return () => ro.disconnect();
  }, [tekst]);

  // Snelheid gelijk houden: ongeveer 40 pixels per seconde
  const schuif = teLang > 0
    ? ({ "--schuif": `-${teLang}px`, animationDuration: `${Math.max(4, teLang / 40 + 3)}s` } as CSSProperties)
    : undefined;

  return (
    <span ref={vakRef} className={className} title={teLang > 0 ? tekst : undefined}
      style={{ display: "block", overflow: "hidden", whiteSpace: "nowrap", ...style }}>
      <span ref={tekstRef} className={teLang > 0 ? "stat-schuif" : undefined} style={{ display: "inline-block", ...schuif }}>{tekst}</span>
    </span>
  );
}
