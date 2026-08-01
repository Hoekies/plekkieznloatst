import type { createAdminClient } from "@/lib/supabase-admin";

type AdminClient = ReturnType<typeof createAdminClient>;

// Cache-raster: ~0,005° ≈ 500 m. Grof genoeg om herhaalde opzoekingen te bundelen,
// fijn genoeg om een dorpsgrens niet over te slaan.
const CACHE_RASTER_GRADEN = 0.005;
const NOMINATIM_TIMEOUT_MS = 3000;

// Hoe ver een team mag lopen voordat we opnieuw kijken in welke plaats het zit.
export const PLAATS_HERCHECK_M = 1000;

function celKey(lat: number, lng: number): string {
  const rl = Math.round(lat / CACHE_RASTER_GRADEN) * CACHE_RASTER_GRADEN;
  const rg = Math.round(lng / CACHE_RASTER_GRADEN) * CACHE_RASTER_GRADEN;
  return `${rl.toFixed(4)},${rg.toFixed(4)}`;
}

/**
 * Bepaalt de plaatsnaam bij een coördinaat via OpenStreetMap Nominatim, met een
 * gedeelde cache in de database zodat we ruim binnen het limiet van 1 verzoek/seconde blijven.
 *
 * Geeft `null` terug als er geen plaats gevonden is of als Nominatim niet bereikbaar is —
 * het spel mag hier nooit op vastlopen, badges zijn dan simpelweg niet plaatsgebonden.
 */
export async function bepaalPlaats(lat: number, lng: number, admin: AdminClient): Promise<string | null> {
  const key = celKey(lat, lng);

  const { data: gecached } = await admin
    .from("plaats_cache")
    .select("plaats")
    .eq("cel_key", key)
    .maybeSingle();
  if (gecached) return gecached.plaats;

  let plaats: string | null = null;
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14&addressdetails=1`,
      {
        headers: { "User-Agent": "PointRush/1.0 (hoekies.nl)", "Accept-Language": "nl" },
        signal: AbortSignal.timeout(NOMINATIM_TIMEOUT_MS),
      }
    );
    if (res.ok) {
      const data = await res.json();
      const a = data?.address ?? {};
      plaats = a.village ?? a.town ?? a.city ?? a.municipality ?? null;
    }
  } catch {
    // Time-out of netwerkfout: niet cachen, zodat een volgende poging het opnieuw probeert.
    return null;
  }

  // Ook een lege uitkomst cachen — dan blijven we niet elke ronde opnieuw zoeken.
  await admin.from("plaats_cache").upsert({ cel_key: key, plaats }, { onConflict: "cel_key" });

  return plaats;
}
