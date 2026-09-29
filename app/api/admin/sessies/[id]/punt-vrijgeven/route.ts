import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { bepaalVolgendPunt } from "@/lib/volgend-punt";

// Geeft het volgende punt van een team vrij alsof ze het bereikt hebben: bij het team
// springt de vraag van dat punt open, waar ze ook zijn.
export async function POST(_: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user?.app_metadata?.rol !== "admin") return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });

  const admin = createAdminClient();
  const { data: sessie } = await admin
    .from("player_sessions")
    .select("id, route_id")
    .eq("id", params.id)
    .eq("status", "actief")
    .maybeSingle();
  if (!sessie) return NextResponse.json({ fout: "Dit team speelt niet (meer)" }, { status: 404 });

  const punt = await bepaalVolgendPunt(admin, sessie);
  if (!punt) return NextResponse.json({ fout: "Dit team heeft geen volgend punt" }, { status: 400 });

  const { data: bestaand } = await admin
    .from("player_point_progress")
    .select("id")
    .eq("session_id", sessie.id)
    .eq("route_point_id", punt.id)
    .maybeSingle();

  if (!bestaand) {
    const { error } = await admin.from("player_point_progress").insert({
      session_id: sessie.id,
      route_point_id: punt.id,
      reached_at: new Date().toISOString(),
      points_awarded: 0,
    });
    if (error) return NextResponse.json({ fout: error.message }, { status: 500 });
    await admin.from("player_sessions").update({ current_point_id: punt.id }).eq("id", sessie.id);
  }

  await admin
    .from("hulpverzoeken")
    .update({ status: "toegekend", afgehandeld_at: new Date().toISOString() })
    .eq("session_id", sessie.id)
    .eq("status", "open");

  return NextResponse.json({ ok: true, punt: punt.name, al_bereikt: !!bestaand });
}
