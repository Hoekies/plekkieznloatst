import { createHash, timingSafeEqual } from "node:crypto";

// 🤝 Meespeellink: medespelers van een team kijken mee zonder in te loggen. De sleutel hoort bij één spel (sessie), dus
// bij een nieuw spel werkt een oude link vanzelf niet meer. Geen tabel nodig: de sleutel is uit de sessie af te leiden.
export function meespeelSleutel(sessieId: string): string {
  const geheim = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  return createHash("sha256").update(`pointrush-meespelen:${sessieId}:${geheim}`).digest("hex").slice(0, 32);
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function meespeelSleutelKlopt(sessieId: string, sleutel: string): boolean {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !UUID.test(sessieId)) return false;
  const a = Buffer.from(meespeelSleutel(sessieId)), b = Buffer.from(sleutel);
  return a.length === b.length && timingSafeEqual(a, b);
}

type RuwItem = { id: string; type: string; latitude: number; longitude: number; claimed?: boolean | null; is_startitem?: boolean | null };

// Alleen wat de speler zelf op de kaart ziet: geen opgepakte items, geen startitems en geen Plek zooi (een onzichtbare val).
// Op volgorde liggen er verder geen items op de kaart. Vaste velden: wat dit verder over een item weet, gaat niet mee.
export function zichtbareItems(items: RuwItem[], modus: string | null | undefined) {
  if (modus === "sequentieel") return [];
  return items
    .filter((i) => !i.claimed && !i.is_startitem && i.type !== "plekzooi")
    .map(({ id, type, latitude, longitude }) => ({ id, type, latitude, longitude, claimed: false }));
}

// Waar de kaart begint: een rechthoek om de items, ook de opgepakte (anders start de kaart op de verkeerde plek als alles op
// is). Alleen de twee hoeken: dit zegt niet waar een item lag. Zonder startitems en zonder de onzichtbare Plek zooi.
export function itemGebied(items: RuwItem[], modus: string | null | undefined): [number, number][] {
  if (modus === "sequentieel") return [];
  const plekken = items.filter((i) => !i.is_startitem && i.type !== "plekzooi");
  if (!plekken.length) return [];
  const lat = plekken.map((i) => i.latitude), lng = plekken.map((i) => i.longitude);
  return [[Math.min(...lat), Math.min(...lng)], [Math.max(...lat), Math.max(...lng)]];
}

export type MeespeelData =
  | {
      actief: true;
      team: string;
      score: number;
      modus: string;
      items: ReturnType<typeof zichtbareItems>;
      gebied: [number, number][];
      // De getallen in de uitleg van een item (zoals op de spelerskaart)
      waarden: { ster: number; bom: number; spookSec: number; plekzooiSec: number };
      // Itemtypen die het team in de balk heeft
      balk: string[];
      // Alleen de verdiende letters: de rest van het woord verlaat de server nooit
      puzzel: { letters: (string | null)[]; omschrijving: string | null } | null;
      verboden: { naam: string; punten: [number, number][] }[];
    }
  | { actief: false; team: string; reden: "klaar" | "gestopt" | "uit" };
