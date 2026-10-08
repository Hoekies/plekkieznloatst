// Advies voor het aantal items in een verspreide route, zodat het spel eerlijk blijft.
//
// Uitgangspunten:
// - Afstand: om de ~300 m iets om op te pakken, zodat elk team onderweg regelmatig iets tegenkomt.
// - Teams: het eerste team pakt een item weg. Minimaal 2 per team, zodat ook latere teams kans
//   maken; maximaal 3 per team, anders bepalen items de uitslag meer dan de vragen.
// - Speeltijd: een langer spel (veel vragen, lange stukken) heeft meer items nodig om spannend
//   te blijven: ongeveer één item per 6 minuten speeltijd van een team.
// - Respawn: opgepakte items komen terug, dus er is ~30% minder nodig.
// - Plek zooi telt apart (blijft liggen, wordt niet opgepakt): ~1 per km, nooit meer dan het
//   aantal teams.

export const ITEM_GROEPEN = {
  voordeel: ["ster", "verdubbeling", "radar"],
  aanval: ["bom", "spook", "dief", "banaan", "wissel"],
  vraagteken: ["vraagteken"],
  plekzooi: ["plekzooi"],
} as const;

export type ItemAdvies = {
  oppakbaar: number;   // alle items behalve plek zooi
  voordeel: number;    // ster, verdubbeling, radar
  aanval: number;      // bom, spook, dief, banaan, wissel
  vraagteken: number;
  plekzooi: number;
  tussenafstandM: number; // ongeveer zoveel meter tussen twee oppakbare items
};

export function itemAdvies(lusMeter: number, teams: number, respawn: boolean, speelMinuten = 0): ItemAdvies {
  const t = Math.max(2, Math.round(teams));
  let oppakbaar = Math.max(Math.round(lusMeter / 300), Math.round(speelMinuten / 6), 2 * t);
  // Bovengrens: niet meer dan 3 per team, tenzij het rondje zo lang is dat dat te weinig is
  oppakbaar = Math.min(oppakbaar, Math.max(3 * t, Math.round(lusMeter / 250)));
  if (respawn) oppakbaar = Math.max(t, Math.round(oppakbaar * 0.7));

  const vraagteken = oppakbaar >= 8 ? 2 : oppakbaar >= 3 ? 1 : 0;
  const aanval = Math.round(oppakbaar * 0.4);
  const voordeel = Math.max(0, oppakbaar - aanval - vraagteken);
  const plekzooi = Math.min(Math.max(1, Math.round(lusMeter / 1000)), t);

  return {
    oppakbaar, voordeel, aanval, vraagteken, plekzooi,
    tussenafstandM: oppakbaar > 0 ? Math.round(lusMeter / oppakbaar / 10) * 10 : 0,
  };
}

// ── Voorgestelde plekken voor nieuwe items ───────────────────────────────────
type Plek = { lat: number; lng: number };

function meter(a: Plek, b: Plek): number {
  const kx = 111320 * Math.cos((a.lat * Math.PI) / 180), ky = 110540;
  return Math.hypot((b.lng - a.lng) * kx, (b.lat - a.lat) * ky);
}

// Zoekt langs het rondje de plekken die het verst van bestaande items af liggen (de grootste
// "lege" stukken), met afstand tot de punten zelf (vermijd: plek + minimale afstand in meter).
export function voorgesteldePlekken(lus: Plek[], bestaand: Plek[], vermijd: (Plek & { r: number })[], aantal: number): Plek[] {
  if (aantal <= 0 || lus.length < 2) return [];
  // Elke ~10 m een kandidaat langs het gesloten rondje
  const kandidaten: Plek[] = [];
  for (let i = 0; i < lus.length; i++) {
    const a = lus[i], b = lus[(i + 1) % lus.length];
    const stappen = Math.max(1, Math.floor(meter(a, b) / 10));
    for (let s = 0; s < stappen; s++) {
      kandidaten.push({ lat: a.lat + ((b.lat - a.lat) * s) / stappen, lng: a.lng + ((b.lng - a.lng) * s) / stappen });
    }
  }
  const toegestaan = kandidaten.filter((p) => vermijd.every((v) => meter(p, v) >= v.r));
  const bezet = [...bestaand];
  const gekozen: Plek[] = [];
  for (let k = 0; k < aantal; k++) {
    let beste: Plek | null = null, besteAfstand = -1;
    for (const p of toegestaan) {
      const d = bezet.length ? Math.min(...bezet.map((b) => meter(p, b))) : Infinity;
      if (d > besteAfstand) { besteAfstand = d; beste = p; }
    }
    if (!beste || besteAfstand < 60) break; // nergens meer echt ruimte
    gekozen.push(beste);
    bezet.push(beste);
  }
  return gekozen;
}
