"use client";

import { useEffect, useState } from "react";

// 🩺 Bolletje met het aantal problemen uit de Systeemcheck (bijv. een migratie die nog moet), bij ⚙️ Instellingen
// en bij Systeemcheck zelf. Eén keer per 10 minuten gecontroleerd (onthouden in deze browsersessie); de
// Systeemcheck-pagina werkt het meteen bij. Helpers mogen de check niet doen en zien dus niets.
const SLEUTEL = "pr_systeem_problemen";
const GELDIG_MS = 10 * 60 * 1000;
const luisteraars = new Set<(n: number) => void>();

export function zetSysteemProblemen(n: number) {
  try { sessionStorage.setItem(SLEUTEL, JSON.stringify({ n, t: Date.now() })); } catch { /* geen opslag */ }
  luisteraars.forEach((l) => l(n));
}

let bezig = false;
async function controleer() {
  try {
    const oud = JSON.parse(sessionStorage.getItem(SLEUTEL) ?? "null");
    if (oud && Date.now() - oud.t < GELDIG_MS) { luisteraars.forEach((l) => l(oud.n)); return; }
  } catch { /* geen opslag */ }
  if (bezig) return;
  bezig = true;
  const res = await fetch("/api/admin/systeem").catch(() => null);
  bezig = false;
  if (!res?.ok) return;
  const { checks } = await res.json().catch(() => ({ checks: [] }));
  zetSysteemProblemen((checks ?? []).filter((c: { ok: boolean }) => !c.ok).length);
}

export default function SysteemTeller() {
  const [n, setN] = useState(0);
  useEffect(() => {
    luisteraars.add(setN);
    controleer();
    return () => { luisteraars.delete(setN); };
  }, []);
  if (!n) return null;
  return <span className="menu-teller" title={`Systeemcheck: ${n} ${n === 1 ? "punt" : "punten"} om op te lossen`}>{n}</span>;
}
