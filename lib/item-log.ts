import type { createAdminClient } from "@/lib/supabase-admin";

type AdminClient = ReturnType<typeof createAdminClient>;

// Legt vast wie welk item inzette (en op wie), voor het terugkijkscherm na de finish.
// Mag het spel nooit blokkeren: een fout hier wordt genegeerd.
export async function logItem(
  admin: AdminClient,
  rij: {
    gebruiker: string | null; doel: string | null; type: string; omschrijving?: string | null;
    plek?: { lat: number; lng: number } | null;
  },
) {
  try {
    // Waar was het doelteam? Hun laatst opgeslagen locatie (de app slaat die elke paar seconden op)
    let doelPlek: { latitude: number; longitude: number } | null = null;
    if (rij.doel) {
      const { data } = await admin.from("location_updates").select("latitude, longitude")
        .eq("session_id", rij.doel).order("created_at", { ascending: false }).limit(1).maybeSingle();
      doelPlek = data ?? null;
    }
    const basis = {
      gebruiker_session_id: rij.gebruiker,
      doel_session_id: rij.doel,
      item_type: rij.type,
      omschrijving: rij.omschrijving ?? null,
    };
    const { error } = await admin.from("item_log").insert({
      ...basis,
      latitude: rij.plek?.lat ?? null,
      longitude: rij.plek?.lng ?? null,
      doel_latitude: doelPlek?.latitude ?? null,
      doel_longitude: doelPlek?.longitude ?? null,
    });
    // Migratie 032 nog niet gedraaid? Dan in elk geval zonder plek vastleggen
    if (error) await admin.from("item_log").insert(basis);
  } catch { /* logboek is bijzaak */ }
}
