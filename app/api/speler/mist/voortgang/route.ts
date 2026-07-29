import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { MIST_CEL_OPPERVLAK_M2 } from "@/lib/geo";

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });

  const admin = createAdminClient();

  const { data: speler } = await admin
    .from("players").select("id").eq("auth_user_id", user.id).maybeSingle();
  if (!speler) return NextResponse.json({ fout: "Geen speler" }, { status: 403 });

  const { data: sessie } = await admin
    .from("player_sessions")
    .select("id, score")
    .eq("player_id", speler.id)
    .eq("status", "actief")
    .maybeSingle();
  if (!sessie) return NextResponse.json({ fout: "Geen actieve sessie" }, { status: 403 });

  const { data: cellen } = await admin
    .from("mist_voortgang")
    .select("cell_x, cell_y")
    .eq("session_id", sessie.id);

  const totaalM2 = (cellen?.length ?? 0) * MIST_CEL_OPPERVLAK_M2;

  return NextResponse.json({
    cellen: cellen ?? [],
    totaalM2,
    score: sessie.score,
  });
}
