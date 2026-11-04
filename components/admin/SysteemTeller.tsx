"use client";

import { useEffect, useState } from "react";
import type { Check } from "@/app/api/admin/systeem/route";

// 🩺 Bolletje met het aantal problemen uit de Systeemcheck (bijv. een migratie die nog moet, of een nieuwe foutmelding),
// bij ⚙️ Instellingen en bij Systeemcheck zelf. Licht: hoogstens eens per half uur alleen de kolommen, instellingen en
// nieuwe fouten (onthouden in deze browsersessie). Wat alleen de volledige check ziet, onthouden we van de laatste keer
// dat de Systeemcheck-pagina open was. Helpers mogen de check niet doen en zien dus niets.
const SLEUTEL = "pr_systeem_problemen";
const VOL_SLEUTEL = "pr_systeem_vol";
export const FOUTEN_GEZIEN = "pr_fouten_gezien";
const GELDIG_MS = 30 * 60 * 1000;
const luisteraars = new Set<(n: number) => void>();

export function zetSysteemProblemen(n: number) {
  try { sessionStorage.setItem(SLEUTEL, JSON.stringify({ n, t: Date.now() })); } catch { /* geen opslag */ }
  luisteraars.forEach((l) => l(n));
}

// De Systeemcheck-pagina geeft de volledige uitslag door; de foutmeldingen staan daar nu in beeld, dus die zijn gezien
export function zetVolledigeCheck(checks: Check[]) {
  const mis = checks.filter((c) => !c.ok && !c.info && !c.tijdelijk);
  try {
    localStorage.setItem(VOL_SLEUTEL, String(mis.filter((c) => !c.licht).length));
    localStorage.setItem(FOUTEN_GEZIEN, new Date().toISOString());
  } catch { /* geen opslag */ }
  zetSysteemProblemen(mis.length);
}

let bezig = false;
async function controleer() {
  try {
    const oud = JSON.parse(sessionStorage.getItem(SLEUTEL) ?? "null");
    if (oud && Date.now() - oud.t < GELDIG_MS) { luisteraars.forEach((l) => l(oud.n)); return; }
  } catch { /* geen opslag */ }
  if (bezig) return;
  bezig = true;
  let sinds: string | null = null, vol = 0;
  try { sinds = localStorage.getItem(FOUTEN_GEZIEN); vol = Number(localStorage.getItem(VOL_SLEUTEL) ?? 0); } catch { /* geen opslag */ }
  const res = await fetch(`/api/admin/systeem?teller=1${sinds ? `&sinds=${encodeURIComponent(sinds)}` : ""}`).catch(() => null);
  bezig = false;
  if (!res?.ok) return;
  const { checks, fouten } = await res.json().catch(() => ({ checks: [], fouten: 0 }));
  zetSysteemProblemen(((checks ?? []) as Check[]).filter((c) => !c.ok && !c.info).length + (fouten ?? 0) + vol);
}

export default function SysteemTeller() {
  const [n, setN] = useState(0);
  useEffect(() => {
    luisteraars.add(setN);
    controleer();
    return () => { luisteraars.delete(setN); };
  }, []);
  if (!n) return null;
  return <span className="menu-teller" title={`Systeemcheck: ${n} ${n === 1 ? "punt" : "punten"} om na te kijken`}>{n}</span>;
}
