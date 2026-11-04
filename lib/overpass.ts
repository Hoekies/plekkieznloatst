// 🧱 Overpass (OpenStreetMap-gegevens): een gratis dienst die regelmatig overbelast is, dus altijd met een reserve.
export const OVERPASS_SERVERS = ["https://overpass-api.de/api", "https://maps.mail.ru/osm/tools/overpass/api"];

// De eerste server die antwoordt; null als het bij geen enkele lukt
export async function vraagOverpass<T>(query: string, perServerMs: number): Promise<T | null> {
  for (const server of OVERPASS_SERVERS) {
    try {
      const res = await fetch(`${server}/interpreter`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "PointRush/1.0 (hoekies.nl)" },
        body: `data=${encodeURIComponent(query)}`,
        signal: AbortSignal.timeout(perServerMs),
      });
      if (res.ok) return await res.json() as T;
    } catch { /* volgende server */ }
  }
  return null;
}
