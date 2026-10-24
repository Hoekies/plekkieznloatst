import { NextResponse } from "next/server";
import { haalGebruiker, isAdmin } from "@/lib/auth-server";
import { createAdminClient } from "@/lib/supabase-admin";

export async function POST() {
  const user = await haalGebruiker();
  if (!isAdmin(user)) {
    return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });
  }

  const admin = createAdminClient();

  const { data: routes } = await admin.from("routes").update({ is_active: false }).eq("is_active", true).select("id");

  // Lopende spellen op die route meteen afsluiten: de app van de spelers ziet dat binnen ~5s,
  // toont "De route is gestopt" en gaat naar het startscherm (anders liepen ze door op een uitgezette route)
  const routeIds = (routes ?? []).map((r) => r.id);
  if (routeIds.length) {
    const { data: sessies } = await admin
      .from("player_sessions")
      .update({ status: "vervallen" })
      .in("route_id", routeIds)
      .eq("status", "actief")
      .select("id");
    const sessieIds = (sessies ?? []).map((s) => s.id);
    if (sessieIds.length) {
      await admin
        .from("hulpverzoeken")
        .update({ status: "genegeerd", afgehandeld_at: new Date().toISOString() })
        .in("session_id", sessieIds)
        .eq("status", "open");
    }
  }

  return NextResponse.json({ ok: true });
}
