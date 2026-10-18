import { haversine } from "@/lib/geo";

// Punten importeren in de route-editor: uit een GPX- of KML-bestand (bijv. Google My Maps),
// of uit een lijst met regels "lat, lng naam" en Google Maps-links.
export type ImportPunt = { lat: number; lng: number; naam: string | null };
export type ImportResultaat = { punten: ImportPunt[]; nietHerkend: string[]; korteLinks: string[] };

// Spoor uit een GPX (duizenden metingen): één punt per zoveel meter
const SPOOR_AFSTAND_M = 150;
const MAX_PUNTEN = 200;

function geldig(lat: number, lng: number) {
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && !(lat === 0 && lng === 0);
}

// Korte deellinks van de Google Maps-app: de server zoekt uit waar ze naartoe wijzen
export const KORTE_LINK = /https?:\/\/(?:maps\.app\.goo\.gl|goo\.gl\/maps|g\.co\/kgs)\/\S+/i;

// Coördinaten uit een (lange) Google Maps-link
export function coordsUitLink(url: string): { lat: number; lng: number; naam: string | null } | null {
  let u = url;
  try { u = decodeURIComponent(url); } catch { /* laat staan */ }
  const naamMatch = /\/place\/([^/@]+)/.exec(u);
  const naam = naamMatch ? naamMatch[1].replace(/\+/g, " ").trim() : null;
  const patronen = [
    /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/,                                    // de plek zelf
    /[?&](?:q|query|ll|destination|center)=(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/, // ?q=52.1,5.2
    /@(-?\d+\.\d+),(-?\d+\.\d+)/,                                        // midden van de kaart
  ];
  for (const p of patronen) {
    const m = p.exec(u);
    if (m && geldig(Number(m[1]), Number(m[2]))) return { lat: Number(m[1]), lng: Number(m[2]), naam };
  }
  return null;
}

function naamUitRest(rest: string): string | null {
  const n = rest.replace(/^[\s,;:\t|-]+|[\s,;:\t|-]+$/g, "").replace(/\s+/g, " ").trim();
  return n ? n.slice(0, 60) : null;
}

function regel(r: string): ImportPunt | null {
  const url = /https?:\/\/\S+/.exec(r)?.[0];
  if (url && !KORTE_LINK.test(url)) {
    const c = coordsUitLink(url);
    if (c) return { lat: c.lat, lng: c.lng, naam: naamUitRest(r.replace(url, "")) ?? c.naam };
    return null;
  }
  // 52.123, 5.456 of 52.123 5.456 (punt als decimaalteken)
  let m = /(-?\d{1,2}\.\d+)\s*[,;\s]\s*(-?\d{1,3}\.\d+)/.exec(r);
  // 52,123; 5,456 of 52,123 5,456 (komma als decimaalteken)
  if (!m) m = /(-?\d{1,2},\d+)\s*[;\s]\s*(-?\d{1,3},\d+)/.exec(r);
  if (!m) return null;
  const lat = Number(m[1].replace(",", ".")), lng = Number(m[2].replace(",", "."));
  if (!geldig(lat, lng)) return null;
  return { lat, lng, naam: naamUitRest(r.replace(m[0], "")) };
}

function xml(tekst: string): ImportPunt[] | null {
  if (!/<(gpx|kml)[\s>]/i.test(tekst)) return null;
  const doc = new DOMParser().parseFromString(tekst, "application/xml");
  const naamVan = (el: Element) => el.getElementsByTagName("name")[0]?.textContent?.trim() || null;

  // KML (Google My Maps): <Placemark><name/><Point><coordinates>lng,lat,0</coordinates></Point></Placemark>
  const placemarks = [...doc.getElementsByTagName("Placemark")];
  if (placemarks.length) {
    return placemarks.flatMap((pm) => {
      const c = pm.getElementsByTagName("Point")[0]?.getElementsByTagName("coordinates")[0]?.textContent?.trim();
      if (!c) return [];
      const [lng, lat] = c.split(",").map(Number);
      return geldig(lat, lng) ? [{ lat, lng, naam: naamVan(pm) }] : [];
    });
  }

  const lees = (tag: string) => [...doc.getElementsByTagName(tag)].flatMap((el) => {
    const lat = Number(el.getAttribute("lat")), lng = Number(el.getAttribute("lon"));
    return geldig(lat, lng) ? [{ lat, lng, naam: naamVan(el) }] : [];
  });
  // Waypoints of routepunten zijn echte punten; een spoor dunnen we uit
  const wpt = [...lees("wpt"), ...lees("rtept")];
  if (wpt.length) return wpt;
  const spoor = lees("trkpt");
  const uit: ImportPunt[] = [];
  for (const p of spoor) {
    const vorige = uit[uit.length - 1];
    if (!vorige || haversine(vorige.lat, vorige.lng, p.lat, p.lng) >= SPOOR_AFSTAND_M) uit.push({ ...p, naam: null });
  }
  return uit;
}

export function leesPunten(tekst: string): ImportResultaat {
  const uitXml = xml(tekst);
  if (uitXml) return { punten: uitXml.slice(0, MAX_PUNTEN), nietHerkend: [], korteLinks: [] };

  const punten: ImportPunt[] = [];
  const nietHerkend: string[] = [];
  const korteLinks: string[] = [];
  for (const r of tekst.split(/\r?\n/).map((x) => x.trim()).filter(Boolean)) {
    const kort = KORTE_LINK.exec(r)?.[0];
    if (kort) { korteLinks.push(kort); continue; }
    const p = regel(r);
    if (p) punten.push(p); else nietHerkend.push(r);
  }
  return { punten: punten.slice(0, MAX_PUNTEN), nietHerkend, korteLinks };
}
