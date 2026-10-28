import { haversine } from "@/lib/geo";

// 📍 Is het team echt bij dit punt of item? De app ziet dat zelf aan de GPS, maar de server controleert het
// ook: anders kan een punt of item met alleen een id worden "bereikt". Ruim genomen (100 m extra plus de
// onnauwkeurigheid van de GPS), zodat slechte GPS of een net te vroege melding niemand tegenhoudt.
// GPS van een telefoon blijft te vervalsen; dit houdt alleen het simpelste valsspelen tegen.
const MARGE_M = 100;

type Plek = { latitude: number; longitude: number; radius_meters?: number | null };

// Geeft een foutmelding, of null als het klopt
export function nietDichtbij(doel: Plek, body: { latitude?: unknown; longitude?: unknown; accuracy?: unknown }): string | null {
  if (typeof body.latitude !== "number" || typeof body.longitude !== "number") return "Je locatie ontbreekt: zet je locatie aan en probeer het opnieuw";
  const nauwkeurig = typeof body.accuracy === "number" && body.accuracy > 0 ? Math.min(body.accuracy, 100) : 50;
  const afstand = haversine(body.latitude, body.longitude, doel.latitude, doel.longitude);
  return afstand > (doel.radius_meters ?? 15) + MARGE_M + nauwkeurig ? "Je bent nog niet bij dit punt" : null;
}
