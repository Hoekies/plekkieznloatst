import { haversine, tekstKlopt } from "@/lib/geo";

// 🔤 🔀 🗺️ Nieuwe vraagsoorten (migratie 009): de beoordeling, gedeeld door de server (voortgang/verwerk) en de proef
// in de editor, zodat die precies hetzelfde rekenen.

// 🔤 Anagram: het team typt het woord (hoofdletters en spaties maken niet uit)
export function scoorAnagram(antwoord: string, goed: string[], punten: number): { goed: boolean; punten: number } {
  const ok = goed.some((g) => tekstKlopt(antwoord, g));
  return { goed: ok, punten: ok ? punten : 0 };
}

// De letters van het woord door elkaar (nooit precies in de goede volgorde, als dat kan)
export function husselLetters(woord: string): string[] {
  const letters = woord.replace(/\s+/g, "").toUpperCase().split("");
  for (let poging = 0; poging < 10; poging++) {
    for (let i = letters.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [letters[i], letters[j]] = [letters[j], letters[i]]; }
    if (letters.join("") !== woord.replace(/\s+/g, "").toUpperCase() || new Set(letters).size < 2) break;
  }
  return letters;
}

// 🔀 Volgorde: punten naar het aantal items op de goede plek; alleen alles goed telt als "goed"
export function scoorVolgorde(gekozen: string[], opties: { id: string; order_index: number }[], punten: number): { goed: boolean; punten: number; goedePlekken: number; juist: string[] } {
  const juist = [...opties].sort((a, b) => a.order_index - b.order_index).map((o) => o.id);
  const goedePlekken = juist.filter((id, i) => gekozen[i] === id).length;
  const n = juist.length || 1;
  return { goed: goedePlekken === juist.length && juist.length > 0, punten: Math.round((punten * goedePlekken) / n), goedePlekken, juist };
}

// 🗺️ Kaartvraag: binnen de straal alle punten; daarbuiten steeds minder, tot 0 op vijf keer de straal
export function scoorKaart(lat: number, lng: number, doel: { lat: number; lng: number; straal: number }, punten: number): { goed: boolean; punten: number; afstand: number } {
  const afstand = Math.round(haversine(lat, lng, doel.lat, doel.lng));
  const straal = Math.max(5, doel.straal);
  if (afstand <= straal) return { goed: true, punten, afstand };
  const deel = Math.max(0, 1 - (afstand - straal) / (4 * straal));
  return { goed: false, punten: Math.round(punten * deel), afstand };
}
export const KAART_STRALEN = [25, 50, 100, 250, 500] as const;
export const afstandTekst = (m: number) => (m >= 1000 ? `${(m / 1000).toFixed(1).replace(".", ",")} km` : `${m} m`);
