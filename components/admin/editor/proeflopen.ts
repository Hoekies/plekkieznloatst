// 🚶 Proeflopen in de route-editor: klik over de kaart en loop als testspeler mee. Punten, items en
// vallen gaan af zoals op straat (zelfde straal, zelfde volgorde), maar er wordt niets opgeslagen.
import type { RoutePunt, SpeciaalItem } from "@/types/database";
import { haversine } from "@/lib/geo";
import { itemNaam } from "@/components/speler/SpeciaalItemLegende";

export type ProefRegel = { tekst: string; soort: "punt" | "item" | "val" | "finish" | "let-op" };
export type ProefStand = {
  pos: { lat: number; lng: number } | null;
  spoor: [number, number][];
  gelopenM: number;
  volgende: number;         // index van het volgende punt
  gepakt: string[];         // id's van opgepakte items (en geraakte vallen)
  log: ProefRegel[];        // nieuwste eerst
  klaar: boolean;
};

export const NIEUWE_PROEF: ProefStand = { pos: null, spoor: [], gelopenM: 0, volgende: 0, gepakt: [], log: [], klaar: false };

const STAP_M = 3;

function kort(t: string, n = 60) { return t.length > n ? `${t.slice(0, n - 1)}…` : t; }

function puntRegel(p: RoutePunt, heeftVraag: boolean): ProefRegel {
  if (p.type === "eindpunt") return { tekst: `🏁 ${p.name}: finish!`, soort: "finish" };
  if (p.type === "doorlooppunt") return { tekst: `🚶 ${p.name} gepasseerd (geen scherm)`, soort: "punt" };
  if (heeftVraag) return { tekst: `❓ ${p.name}: de vraag gaat open`, soort: "punt" };
  if (p.type === "vraagpunt") return { tekst: `⚠️ ${p.name}: vraagpunt zonder vraag`, soort: "let-op" };
  return p.description?.trim()
    ? { tekst: `ℹ️ ${p.name}: "${kort(p.description.trim())}"`, soort: "punt" }
    : { tekst: `⚠️ ${p.name}: infopunt zonder tekst`, soort: "let-op" };
}

// Loop in een rechte lijn naar `doel` en kijk onderweg om de paar meter wat er gebeurt
export function loopNaar(stand: ProefStand, doel: { lat: number; lng: number }, punten: RoutePunt[], items: SpeciaalItem[], vraagIds: Set<string>): ProefStand {
  const s: ProefStand = { ...stand, spoor: [...stand.spoor], gepakt: [...stand.gepakt], log: [...stand.log] };
  const van = s.pos ?? doel;
  const afstand = haversine(van.lat, van.lng, doel.lat, doel.lng);
  const stappen = Math.max(1, Math.ceil(afstand / STAP_M));
  const nieuw: ProefRegel[] = [];
  const binnen = (lat: number, lng: number, p: { latitude: number; longitude: number; radius_meters: number }) =>
    haversine(lat, lng, p.latitude, p.longitude) <= p.radius_meters;

  for (let k = s.pos ? 1 : stappen; k <= stappen; k++) {
    const lat = van.lat + ((doel.lat - van.lat) * k) / stappen;
    const lng = van.lng + ((doel.lng - van.lng) * k) / stappen;
    // Volgende punt bereikt? Of een later punt, als alles daartussen doorlooppunten zijn
    if (!s.klaar) {
      let doelIndex = -1;
      for (let j = s.volgende; j < punten.length; j++) {
        if (binnen(lat, lng, punten[j])) { doelIndex = j; break; }
        if (punten[j].type !== "doorlooppunt") break;
      }
      for (let j = s.volgende; doelIndex >= 0 && j <= doelIndex; j++) {
        nieuw.push(j < doelIndex ? { tekst: `🚶 ${punten[j].name} gemist, telt toch (bocht afgesneden)`, soort: "punt" } : puntRegel(punten[j], vraagIds.has(punten[j].id)));
        if (punten[j].type === "eindpunt") s.klaar = true;
      }
      if (doelIndex >= 0) s.volgende = doelIndex + 1;
      if (s.volgende >= punten.length) s.klaar = true;
    }
    // Items oppakken en in vallen lopen (startitems liggen niet op de kaart)
    for (const it of items) {
      if (it.is_startitem || s.gepakt.includes(it.id) || !binnen(lat, lng, it)) continue;
      s.gepakt.push(it.id);
      nieuw.push(it.type === "plekzooi"
        ? { tekst: "⛔ In een plek zooi gelopen: even stilstaan", soort: "val" }
        : { tekst: `🎁 ${itemNaam(it.type)} opgepakt`, soort: "item" });
    }
  }
  s.gelopenM += s.pos ? afstand : 0;
  s.pos = doel;
  s.spoor.push([doel.lat, doel.lng]);
  s.log = [...nieuw.reverse(), ...s.log].slice(0, 30);
  return s;
}
