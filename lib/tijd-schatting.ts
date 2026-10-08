import { haversine } from "@/lib/geo";

// Schatting van afstand en speeltijd per team voor een verspreide route, voor de editor.
// Het blijft een inschatting: echte teams lopen omwegen, zoeken, overleggen en pauzeren.

export const LOOPSNELHEID_M_PER_MIN = 75;   // 4,5 km/u, wandeltempo van een groep
const MIN_PER_VRAAG = 2;                    // lezen, overleggen, antwoorden (foto iets langer, open korter)
const MIN_PER_INFOPUNT = 0.5;
const ITEM_BEREIK_M = 150;                  // items verder van de route laat een team meestal liggen
const MIN_PER_ITEM = 0.5;                   // oppakken en inzetten

type Plek = { lat: number; lng: number };
export type SchattingItem = Plek & { type: string; radius: number };

export type TijdSchatting = {
  afstandM: number;
  lopenMin: number;
  vragenMin: number;
  itemsMin: number;
  totaalMin: number;
};

// Kortste afstand (m) van een plek tot een lijnstuk, in een vlakke benadering (prima op wandelschaal)
function afstandTotLijn(p: Plek, a: Plek, b: Plek): number {
  const kx = 111320 * Math.cos((p.lat * Math.PI) / 180), ky = 110540;
  const ax = (a.lng - p.lng) * kx, ay = (a.lat - p.lat) * ky;
  const bx = (b.lng - p.lng) * kx, by = (b.lat - p.lat) * ky;
  const dx = bx - ax, dy = by - ay;
  const len2 = dx * dx + dy * dy;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, -(ax * dx + ay * dy) / len2));
  return Math.hypot(ax + t * dx, ay + t * dy);
}
function afstandTotRoute(p: Plek, route: Plek[]): number {
  let min = Infinity;
  for (let i = 1; i < route.length; i++) min = Math.min(min, afstandTotLijn(p, route[i - 1], route[i]));
  return min;
}

export function schatTeamTijd(route: Plek[], o: {
  vragen: number;
  infopunten: number;
  items: SchattingItem[];
  teams: number;
  respawn: boolean;
  spookMin: number;
  plekzooiMin: number;
}): TijdSchatting {
  let afstandM = 0;
  for (let i = 1; i < route.length; i++) afstandM += haversine(route[i - 1].lat, route[i - 1].lng, route[i].lat, route[i].lng);
  const stukken = Math.max(1, route.length - 1);
  const gemStukM = afstandM / stukken;
  const teams = Math.max(1, o.teams);

  const lopenMin = afstandM / LOOPSNELHEID_M_PER_MIN;
  const vragenMin = o.vragen * MIN_PER_VRAAG + o.infopunten * MIN_PER_INFOPUNT;

  let itemsMin = 0;
  for (const it of o.items) {
    const d = afstandTotRoute(it, route);
    if (it.type === "plekzooi") {
      // Ligt de val op de route, dan loopt elk team erin
      if (d <= it.radius + 10) itemsMin += o.plekzooiMin;
      continue;
    }
    if (d > ITEM_BEREIK_M) continue;
    // Oppakken: omweg heen en terug. Zonder respawn pakt maar één team het (gemiddeld 1/teams per team).
    const pakKans = o.respawn ? 1 : 1 / teams;
    itemsMin += pakKans * ((2 * d) / LOOPSNELHEID_M_PER_MIN + MIN_PER_ITEM);
    // Ontvangen: elk gebruikt spook of elke banaan raakt één tegenstander, gemiddeld 1/teams per team
    // (met respawn wordt een item vaker gebruikt: we rekenen met 2×)
    const ontvangKans = (o.respawn ? 2 : 1) / teams;
    if (it.type === "spook") itemsMin += ontvangKans * o.spookMin * 0.5;                   // ongeveer de helft stil
    if (it.type === "banaan") itemsMin += ontvangKans * (gemStukM / LOOPSNELHEID_M_PER_MIN); // ongeveer één stuk extra lopen
  }

  return {
    afstandM: Math.round(afstandM),
    lopenMin, vragenMin, itemsMin,
    totaalMin: lopenMin + vragenMin + itemsMin,
  };
}

export function formateerMinuten(min: number): string {
  const m = Math.round(min);
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)} u ${String(m % 60).padStart(2, "0")}`;
}
