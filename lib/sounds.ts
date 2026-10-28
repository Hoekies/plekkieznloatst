let ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  return ctx;
}

// Ontgrendel AudioContext op eerste gebruikersinteractie (vereist door iOS Safari)
export function ontgrendelAudio() {
  try {
    const ac = getCtx();
    if (ac.state === "suspended") ac.resume();
  } catch { /* geen AudioContext support */ }
}

// 🔊 Geluid aan of uit (keuze van de speler in ℹ️, onthouden op dit toestel); trillen blijft gewoon werken
const GELUID_SLEUTEL = "pr_geluid_uit";
export function geluidAan(): boolean {
  try { return localStorage.getItem(GELUID_SLEUTEL) !== "1"; } catch { return true; }
}
export function zetGeluid(aan: boolean) {
  try { localStorage.setItem(GELUID_SLEUTEL, aan ? "0" : "1"); } catch { /* geen opslag */ }
}

function speel(frequenties: number[], duur: number, type: OscillatorType = "sine", volume = 0.3, altijd = false) {
  if (!altijd && !geluidAan()) return;
  try {
    const ac = getCtx();
    if (ac.state === "suspended") ac.resume();
    frequenties.forEach((freq, i) => {
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.connect(gain);
      gain.connect(ac.destination);
      osc.type = type;
      osc.frequency.value = freq;
      const start = ac.currentTime + i * (duur / frequenties.length);
      gain.gain.setValueAtTime(volume, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + duur / frequenties.length);
      osc.start(start);
      osc.stop(start + duur / frequenties.length + 0.05);
    });
  } catch {
    // AudioContext niet beschikbaar (bijv. server-side)
  }
}

// 🔔 Geluidsets: per route te kiezen door de beheerder (⚙️ Instellingen); de speler krijgt de set van zijn route
export type GeluidSet = "klassiek" | "arcade" | "zacht" | "feest";
export const GELUID_SETS: { set: GeluidSet; naam: string }[] = [
  { set: "klassiek", naam: "🎵 Klassiek" }, { set: "arcade", naam: "👾 Arcade" }, { set: "zacht", naam: "🌙 Zacht" }, { set: "feest", naam: "🎺 Feest" },
];
type Toon = [number[], number, OscillatorType, number];
const SETS: Record<GeluidSet, { punt: Toon; goed: Toon; fout: Toon; finish: Toon }> = {
  // Vrolijke oplopende tonen, een lage buzz bij fout en een triomfantelijke reeks bij de finish
  klassiek: {
    punt: [[523, 659, 784], 0.5, "sine", 0.25], goed: [[523, 659, 784, 1047], 0.6, "sine", 0.28],
    fout: [[220, 196], 0.4, "sawtooth", 0.15], finish: [[523, 659, 784, 659, 784, 1047], 0.9, "sine", 0.3],
  },
  // Spelcomputer: korte blokgolf-piepjes
  arcade: {
    punt: [[988, 1319], 0.18, "square", 0.12], goed: [[784, 988, 1175, 1568], 0.36, "square", 0.12],
    fout: [[392, 330, 262, 196], 0.5, "square", 0.12], finish: [[523, 659, 784, 1047, 784, 1047, 1319, 1568], 1.0, "square", 0.12],
  },
  // Rustig: zachte driehoekstonen, lager volume
  zacht: {
    punt: [[440, 554], 0.6, "triangle", 0.18], goed: [[523, 659, 784], 0.8, "triangle", 0.2],
    fout: [[294, 262], 0.6, "triangle", 0.14], finish: [[392, 523, 659, 784], 1.4, "triangle", 0.22],
  },
  // Feest: snelle fanfare met veel noten
  feest: {
    punt: [[659, 784, 1047, 1319], 0.4, "sawtooth", 0.1], goed: [[523, 659, 784, 1047, 1319, 1568], 0.6, "sawtooth", 0.1],
    fout: [[311, 294, 277, 262], 0.6, "sawtooth", 0.1], finish: [[523, 523, 784, 784, 880, 880, 784, 1047, 1319, 1568], 1.5, "sawtooth", 0.1],
  },
};
let huidigeSet: GeluidSet = "klassiek";
export function zetGeluidSet(set: string | null | undefined) {
  huidigeSet = set && set in SETS ? (set as GeluidSet) : "klassiek";
}
const speelToon = ([f, d, t, v]: Toon) => speel(f, d, t, v);

export function speelPuntBereikt() { speelToon(SETS[huidigeSet].punt); }
export function speelGoedAntwoord() { speelToon(SETS[huidigeSet].goed); }
export function speelFoutAntwoord() { speelToon(SETS[huidigeSet].fout); }
export function speelFinish() { speelToon(SETS[huidigeSet].finish); }

// Voorbeeld in het beheer: de hele set achter elkaar (punt, goed, fout, finish), ook als geluid "uit" staat
export function speelVoorbeeld(set: GeluidSet) {
  const s = SETS[set];
  [s.punt, s.goed, s.fout, s.finish].forEach((toon, i) => setTimeout(() => speel(toon[0], toon[1], toon[2], toon[3], true), i * 1100));
}

// 🏆 Uitslag: de winnaar krijgt een fanfare (ta-ta-ta-taaa, twee keer, de tweede hoger)
export function speelOverwinning() {
  speel([523, 523, 523, 698], 0.7, "triangle", 0.28);
  setTimeout(() => speel([659, 659, 659, 880], 0.7, "triangle", 0.28), 750);
  setTimeout(() => speel([784, 1047, 1319, 1568], 1.0, "sine", 0.3), 1500);
}

// 🎺 Uitslag voor wie niet won: een knipogende "wah wah wah wahhh" (glijdende trombone, steeds lager)
export function speelHelaas() {
  if (!geluidAan()) return;
  try {
    const ac = getCtx();
    if (ac.state === "suspended") ac.resume();
    const tonen: [number, number, number][] = [[392, 370, 0.38], [370, 349, 0.38], [349, 330, 0.38], [330, 262, 1.1]];
    let t = ac.currentTime;
    for (const [van, naar, duur] of tonen) {
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = "sawtooth";
      osc.connect(gain);
      gain.connect(ac.destination);
      osc.frequency.setValueAtTime(van, t);
      osc.frequency.linearRampToValueAtTime(naar, t + duur);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.12, t + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + duur);
      osc.start(t);
      osc.stop(t + duur + 0.05);
      t += duur + 0.04;
    }
  } catch {
    // AudioContext niet beschikbaar
  }
}

export function speelDong() {
  // Diepe klokslag — een ander team heeft een item tegen jou ingezet.
  // Grondtoon plus een paar niet-harmonische boventonen, zoals bij een echte klok.
  if (!geluidAan()) return;
  try {
    const ac = getCtx();
    if (ac.state === "suspended") ac.resume();
    const start = ac.currentTime;
    const grondtoon = 262;
    [[1, 0.5, 2.8], [2.4, 0.18, 1.6], [3.9, 0.08, 1.0]].forEach(([factor, volume, uitklinken]) => {
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = "sine";
      osc.frequency.value = grondtoon * factor;
      osc.connect(gain);
      gain.connect(ac.destination);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(volume, start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + uitklinken);
      osc.start(start);
      osc.stop(start + uitklinken + 0.05);
    });
  } catch {
    // AudioContext niet beschikbaar
  }
}
