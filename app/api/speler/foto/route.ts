import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";

async function getSessieEnSpeler() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = createAdminClient();
  const { data: speler } = await admin.from("players").select("id").eq("auth_user_id", user.id).maybeSingle();
  if (!speler) return null;

  const { data: sessie } = await admin
    .from("player_sessions")
    .select("*")
    .eq("player_id", speler.id)
    .eq("status", "actief")
    .maybeSingle();

  return sessie ? { sessie, speler } : null;
}

export async function POST(request: NextRequest) {
  const context = await getSessieEnSpeler();
  if (!context) return NextResponse.json({ fout: "Geen actieve sessie" }, { status: 403 });

  const { sessie } = context;
  const formData = await request.formData();
  const bestand = formData.get("foto") as File | null;
  const routePointId = formData.get("route_point_id") as string | null;

  if (!bestand || !routePointId) {
    return NextResponse.json({ fout: "Foto en route_point_id zijn verplicht" }, { status: 400 });
  }

  // Valideer bestandstype
  const toegestaneTypes = ["image/jpeg", "image/png", "image/webp"];
  if (!toegestaneTypes.includes(bestand.type)) {
    return NextResponse.json({ fout: "Alleen jpeg, png of webp toegestaan" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Controleer of punt bij de route hoort
  const { data: punt } = await admin
    .from("route_points")
    .select("id")
    .eq("id", routePointId)
    .eq("route_id", sessie.route_id)
    .maybeSingle();

  if (!punt) return NextResponse.json({ fout: "Ongeldig punt" }, { status: 400 });

  // Controleer of er al een inzending is
  const { data: bestaandeInzending } = await admin
    .from("foto_inzendingen")
    .select("id")
    .eq("session_id", sessie.id)
    .eq("route_point_id", routePointId)
    .maybeSingle();

  if (bestaandeInzending) return NextResponse.json({ fout: "Al een foto ingediend" }, { status: 409 });

  // Upload naar Storage
  const ext = bestand.type === "image/png" ? "png" : bestand.type === "image/webp" ? "webp" : "jpg";
  const pad = `${sessie.id}/${routePointId}.${ext}`;
  const buffer = Buffer.from(await bestand.arrayBuffer());

  const { error: uploadFout } = await admin.storage
    .from("foto-inzendingen")
    .upload(pad, buffer, { contentType: bestand.type, upsert: true });

  if (uploadFout) return NextResponse.json({ fout: uploadFout.message }, { status: 500 });

  // Player_point_progress aanmaken als die er nog niet is
  await admin.from("player_point_progress").upsert({
    session_id: sessie.id,
    route_point_id: routePointId,
    reached_at: new Date().toISOString(),
    points_awarded: 0,
  }, { onConflict: "session_id,route_point_id", ignoreDuplicates: true });

  // Sessie bijwerken
  await admin.from("player_sessions").update({ current_point_id: routePointId }).eq("id", sessie.id);

  // Foto-inzending aanmaken
  const { data: inzending, error: inzendingFout } = await admin
    .from("foto_inzendingen")
    .insert({
      session_id: sessie.id,
      route_point_id: routePointId,
      foto_pad: pad,
      status: "wacht",
      punten_toegekend: 0,
    })
    .select()
    .single();

  if (inzendingFout) return NextResponse.json({ fout: inzendingFout.message }, { status: 500 });

  return NextResponse.json({ foto_id: inzending.id });
}
