import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ fout: "Niet ingelogd" }, { status: 403 });

  const admin = createAdminClient();
  const { data: speler } = await admin.from("players").select("id").eq("auth_user_id", user.id).maybeSingle();
  if (!speler) return NextResponse.json({ fout: "Speler niet gevonden" }, { status: 403 });

  const { data: sessie } = await admin
    .from("player_sessions")
    .select("route_id")
    .eq("player_id", speler.id)
    .eq("status", "actief")
    .maybeSingle();
  if (!sessie) return NextResponse.json([], { status: 200 });

  const { data: route } = await admin
    .from("routes")
    .select("*") // "*": een ontbrekende kolom laat anders de hele query mislukken
    .eq("id", sessie.route_id)
    .maybeSingle();

  // Respawn: een opgepakt én gebruikt item komt na de ingestelde tijd terug op de kaart,
  // precies zoals de beheerder het neerzette — zelfde type, zelfde plek. Types worden nooit
  // gewijzigd of gewisseld. Zolang een team het item nog in de balk heeft, blijft het van hen.
  if (route?.modus === "verspreid" && route.item_respawn) {
    await admin.from("special_items")
      .update({ claimed: false, claimed_by_session_id: null, claimed_at: null, used_at: null, respawn_at: null })
      .eq("route_id", sessie.route_id)
      .eq("is_startitem", false)
      .eq("claimed", true)
      .not("used_at", "is", null)
      .not("respawn_at", "is", null)
      .lte("respawn_at", new Date().toISOString());
  }

  // Ook opgepakte items meesturen: de kaart slaat die over (claimed), maar de uitleg (ℹ️)
  // blijft zo elk itemtype tonen dat in deze route zit. Startitems zijn altijd geclaimd,
  // dus ze komen alleen in de uitleg. Sequentieel: alleen plek zooi op de kaart.
  let query = admin
    .from("special_items")
    .select("*")
    .eq("route_id", sessie.route_id);
  if (route?.modus === "sequentieel") query = query.or("type.eq.plekzooi,is_startitem.eq.true");
  const { data, error } = await query;
  if (error) return NextResponse.json({ fout: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}
