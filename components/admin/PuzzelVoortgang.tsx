"use client";

import { useEffect, useState } from "react";
import type { SpelerOverzicht } from "@/lib/admin-live";

type Puzzel = NonNullable<SpelerOverzicht["puzzel"]>;

// 🧩 Puzzelwoord van één team (dashboard en live kaart): het hele woord met de gevonden letters in goud,
// de telling, en na de finish wat het team ermee deed
export default function PuzzelVoortgang({ p, gefinisht, lijst = false }: { p: Puzzel; gefinisht: boolean; lijst?: boolean }) {
  const gevonden = p.open.filter(Boolean).length;
  return (
    <span className={`sk-puzzel${lijst ? " sk-puzzel--lijst" : ""}`} title={p.opgelost ? "Puzzelwoord opgelost" : `${gevonden} van ${p.woord.length} letters gevonden`}>
      {!lijst && <span aria-hidden>🧩</span>}
      {p.woord.split("").map((l, i) => (
        <span key={i} className={`sk-puzzel-letter${p.open[i] || p.opgelost ? " sk-puzzel-letter--open" : ""}`}>{l}</span>
      ))}
      <span className="sk-puzzel-telling">{gevonden}/{p.woord.length}</span>
      <RaadStatus p={p} gefinisht={gefinisht} />
    </span>
  );
}

// Na de finish: alles gevonden, de gok (goed of fout), nog bezig met raden, of niet geraden
function RaadStatus({ p, gefinisht }: { p: Puzzel; gefinisht: boolean }) {
  const [nu, setNu] = useState(() => Date.now());
  const raadTot = p.raad_tot ? Date.parse(p.raad_tot) : null;
  const telt = gefinisht && !p.gok && !p.opgelost && !!raadTot && nu < raadTot;
  useEffect(() => {
    if (!telt) return;
    const t = setInterval(() => setNu(Date.now()), 1000);
    return () => clearInterval(t);
  }, [telt]);
  if (!gefinisht) return null;
  if (p.gok) return <span className={`sk-puzzel-gok ${p.goed ? "sk-puzzel-gok--goed" : "sk-puzzel-gok--fout"}`}>{p.goed ? "✓" : "✗"} {p.gok}</span>;
  if (p.opgelost && p.open.every(Boolean)) return <span className="sk-puzzel-gok sk-puzzel-gok--goed">✓ alle letters gevonden</span>;
  if (telt) return <span className="sk-puzzel-gok">⏳ raadt nog ({Math.ceil((raadTot! - nu) / 1000)} s)</span>;
  return <span className="sk-puzzel-gok">— niet geraden</span>;
}
