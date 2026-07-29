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

  const { data: actieveRoute } = await admin
    .from("routes").select("id, modus").eq("is_active", true).maybeSingle();

  await admin.from("routes").update({ is_active: false }).eq("is_active", true);

  // Een mist-spel heeft geen natuurlijk eindpunt (in tegenstelling tot de vragen-route,
  // die vanzelf afloopt) — "Stop route" moet lopende sessies daarom meteen afronden.
  if (actieveRoute?.modus === "mist") {
    await admin
      .from("player_sessions")
      .update({ status: "voltooid", finished_at: new Date().toISOString() })
      .eq("route_id", actieveRoute.id)
      .eq("status", "actief");
  }

  return NextResponse.json({ ok: true });
}
