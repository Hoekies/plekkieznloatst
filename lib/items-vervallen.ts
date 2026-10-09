import type { createAdminClient } from "@/lib/supabase-admin";

type AdminClient = ReturnType<typeof createAdminClient>;

// Een gefinisht team kan geen items meer inzetten: alles wat nog in de balk zat (zoals een
// wissel) vervalt. Mogen sommige items na de finish nog (instelling per item), dan blijven
// alleen die staan; ze vervallen pas bij het vrijgeven van de uitslag.
// Staat respawn aan, dan komen vervallen items daarna gewoon terug op de kaart.
export async function laatItemsVervallen(admin: AdminClient, sessieIds: string[], opties?: { naFinishTypes?: string[] }) {
  if (sessieIds.length === 0) return;
  let query = admin
    .from("special_items")
    .update({ used_at: new Date().toISOString() })
    .in("claimed_by_session_id", sessieIds)
    .is("used_at", null);
  if (opties?.naFinishTypes?.length) query = query.not("type", "in", `(${opties.naFinishTypes.join(",")})`);
  await query;
}
