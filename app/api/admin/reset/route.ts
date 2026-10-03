import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";

export async function POST() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.app_metadata?.rol !== "admin") {
    return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });
  }

  const admin = createAdminClient();

  // Startitems horen bij een sessie en verdwijnen; overige items terug naar onopgehaalde staat.
  // Dit gebeurt vóór het verwijderen van de sessies, die anders via claimed_by_session_id vastzitten.
  await admin.from("special_items").delete().eq("is_startitem", true);
  await admin.from("special_items").update({
    claimed: false,
    claimed_by_session_id: null,
    claimed_at: null,
    used_at: null,
  }).not("id", "is", null);

  // Verwijder in de juiste volgorde (FK constraints)
  await admin.from("player_point_progress").delete().not("id", "is", null);
  await admin.from("location_updates").delete().not("id", "is", null);
  await admin.from("special_item_effects").delete().not("id", "is", null);
  await admin.from("foto_inzendingen").delete().not("id", "is", null);
  // session_point_order cascadet mee via ON DELETE CASCADE
  await admin.from("player_sessions").delete().not("id", "is", null);

  // Handmatige tussenstand-trigger leegmaken zodat 'ie niet doorspookt in de nieuwe game
  await admin.from("routes").update({ tussenstand_trigger_at: null }).not("id", "is", null);

  return NextResponse.json({ ok: true });
}
