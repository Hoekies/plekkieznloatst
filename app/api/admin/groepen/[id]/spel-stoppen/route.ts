import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";

// Beëindigt het lopende spel van een groep. De groep blijft ingelogd; hun app ziet binnen
// ~30s dat er geen actief spel meer is en gaat terug naar het startscherm.
export async function POST(_: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user?.app_metadata?.rol !== "admin") return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("player_sessions")
    .update({ status: "vervallen" })
    .eq("player_id", params.id)
    .eq("status", "actief")
    .select("id");
  if (error) return NextResponse.json({ fout: error.message }, { status: 500 });

  // Openstaande hulpmeldingen van dit spel zijn niet meer relevant
  const sessieIds = (data ?? []).map((s) => s.id);
  if (sessieIds.length) {
    await admin
      .from("hulpverzoeken")
      .update({ status: "genegeerd", afgehandeld_at: new Date().toISOString() })
      .in("session_id", sessieIds)
      .eq("status", "open");
  }

  return NextResponse.json({ ok: true, gestopt: sessieIds.length });
}
