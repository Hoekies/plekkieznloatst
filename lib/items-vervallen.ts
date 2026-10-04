import type { createAdminClient } from "@/lib/supabase-admin";

type AdminClient = ReturnType<typeof createAdminClient>;

// Een gefinisht team kan geen items meer inzetten: alles wat nog in de balk zat (zoals een
// wissel) vervalt. Staat respawn aan, dan komen die items daarna gewoon terug op de kaart.
export async function laatItemsVervallen(admin: AdminClient, sessieIds: string[]) {
  if (sessieIds.length === 0) return;
  await admin
    .from("special_items")
    .update({ used_at: new Date().toISOString() })
    .in("claimed_by_session_id", sessieIds)
    .is("used_at", null);
}
