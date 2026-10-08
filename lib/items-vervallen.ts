import type { createAdminClient } from "@/lib/supabase-admin";
import { ITEMS_NA_FINISH } from "@/lib/item-sessie";

type AdminClient = ReturnType<typeof createAdminClient>;

// Een gefinisht team kan geen items meer inzetten: alles wat nog in de balk zat (zoals een
// wissel) vervalt. Staat "items na de finish" aan, dan vervallen alleen de items die na de
// finish geen nut meer hebben; de rest vervalt pas bij het vrijgeven van de uitslag.
// Staat respawn aan, dan komen vervallen items daarna gewoon terug op de kaart.
export async function laatItemsVervallen(admin: AdminClient, sessieIds: string[], opties?: { naFinishToegestaan?: boolean }) {
  if (sessieIds.length === 0) return;
  let query = admin
    .from("special_items")
    .update({ used_at: new Date().toISOString() })
    .in("claimed_by_session_id", sessieIds)
    .is("used_at", null);
  if (opties?.naFinishToegestaan) query = query.not("type", "in", `(${ITEMS_NA_FINISH.join(",")})`);
  await query;
}
