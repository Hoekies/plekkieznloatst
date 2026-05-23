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

function speel(frequenties: number[], duur: number, type: OscillatorType = "sine", volume = 0.3) {
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

export function speelPuntBereikt() {
  // Vrolijke oplopende toon: punt gevonden!
  speel([523, 659, 784], 0.5, "sine", 0.25);
}

export function speelGoedAntwoord() {
  // Blije fanfare: juist!
  speel([523, 659, 784, 1047], 0.6, "sine", 0.28);
}

export function speelFoutAntwoord() {
  // Lage buzz: fout
  speel([220, 196], 0.4, "sawtooth", 0.15);
}

export function speelFinish() {
  // Triomfantelijke reeks
  speel([523, 659, 784, 659, 784, 1047], 0.9, "sine", 0.3);
}
