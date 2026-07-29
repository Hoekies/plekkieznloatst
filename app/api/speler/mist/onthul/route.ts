import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { mistCellenBinnenStraal, MIST_CEL_OPPERVLAK_M2 } from "@/lib/geo";

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });

  const admin = createAdminClient();

  const { data: speler } = await admin
    .from("players").select("id").eq("auth_user_id", user.id).maybeSingle();
  if (!speler) return NextResponse.json({ fout: "Geen speler" }, { status: 403 });

  const { data: sessie } = await admin
    .from("player_sessions")
    .select("id, route_id, score")
    .eq("player_id", speler.id)
    .eq("status", "actief")
    .maybeSingle();
  if (!sessie) return NextResponse.json({ fout: "Geen actieve sessie" }, { status: 403 });

  const { lat, lng } = await request.json();
  if (typeof lat !== "number" || typeof lng !== "number") {
    return NextResponse.json({ fout: "Ongeldige coördinaten" }, { status: 400 });
  }

  const { data: route } = await admin
    .from("routes")
    .select("mist_m2_per_ster")
    .eq("id", sessie.route_id)
    .maybeSingle();
  if (!route) return NextResponse.json({ fout: "Route niet gevonden" }, { status: 400 });

  const cellen = mistCellenBinnenStraal(lat, lng);
  await admin
    .from("mist_voortgang")
    .upsert(
      cellen.map((c) => ({ session_id: sessie.id, cell_x: c.x, cell_y: c.y })),
      { onConflict: "session_id,cell_x,cell_y", ignoreDuplicates: true }
    );

  const { count } = await admin
    .from("mist_voortgang")
    .select("id", { count: "exact", head: true })
    .eq("session_id", sessie.id);

  const totaalM2 = (count ?? 0) * MIST_CEL_OPPERVLAK_M2;
  const nieuweScore = Math.floor(totaalM2 / route.mist_m2_per_ster);

  if (nieuweScore > sessie.score) {
    await admin.from("player_sessions").update({ score: nieuweScore }).eq("id", sessie.id);
  }

  return NextResponse.json({ totaalM2, score: Math.max(nieuweScore, sessie.score) });
}
