import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { afrondenOpRaster } from "@/lib/geo";

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
    .select("id")
    .eq("player_id", speler.id)
    .eq("status", "actief")
    .maybeSingle();
  if (!sessie) return NextResponse.json({ fout: "Geen actieve sessie" }, { status: 403 });

  const { latitude, longitude, accuracy } = await request.json();
  if (typeof latitude !== "number" || typeof longitude !== "number") {
    return NextResponse.json({ fout: "Ongeldige coördinaten" }, { status: 400 });
  }

  const publiek = afrondenOpRaster(latitude, longitude, 50);

  const { data, error } = await admin
    .from("location_updates")
    .insert({
      session_id: sessie.id,
      latitude,
      longitude,
      accuracy_meters: accuracy ?? 0,
      public_latitude: publiek.lat,
      public_longitude: publiek.lng,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ fout: error.message }, { status: 500 });

  return NextResponse.json(data);
}
