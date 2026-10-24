"use client";

import { useEffect, useState } from "react";
import type { LiveData } from "@/lib/admin-live";

export type HulpMelding = { id: string; sessie_id: string; team: string; punt: string | null; sinds: string };
type Status = { hulp: HulpMelding[]; live: LiveData | null };

// 📡 Eén gedeelde bron voor het hele beheer: de open hulpvragen (elke 5 s) en de live stand (elke 10 s), voor de
// hulpmelding, de teller in het tabblad en de spelstrook. Het dashboard haalt de live stand zelf al vaker op en
// geeft hem door (meldLiveData); dan wordt hij hier niet nog eens opgehaald.
let staat: Status = { hulp: [], live: null };
let liveOp = 0;
let tik = 0;
let timer: ReturnType<typeof setInterval> | null = null;
const luisteraars = new Set<(s: Status) => void>();
const zend = () => luisteraars.forEach((f) => f(staat));

export async function verversBeheerStatus(ookLive = true) {
  const hulp = await fetch("/api/admin/hulp").then((r) => (r.ok ? r.json() : null)).catch(() => null);
  let live = staat.live;
  if (ookLive && Date.now() - liveOp > 8000) {
    const l = await fetch("/api/admin/live/spelers").then((r) => (r.ok ? r.json() : null)).catch(() => null);
    if (l) { live = l; liveOp = Date.now(); }
  }
  staat = { hulp: Array.isArray(hulp) ? hulp : staat.hulp, live };
  zend();
}

export function meldLiveData(live: LiveData) {
  liveOp = Date.now();
  staat = { ...staat, live };
  zend();
}

export function useBeheerStatus(): Status {
  const [s, setS] = useState(staat);
  useEffect(() => {
    luisteraars.add(setS);
    setS(staat);
    if (!timer) {
      verversBeheerStatus();
      timer = setInterval(() => { tik++; verversBeheerStatus(tik % 2 === 0); }, 5000);
    }
    return () => {
      luisteraars.delete(setS);
      if (!luisteraars.size && timer) { clearInterval(timer); timer = null; }
    };
  }, []);
  return s;
}
