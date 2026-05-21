import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";

async function getSpeler() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const admin = createAdminClient();
  const { data: speler } = await admin
    .from("players")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  return speler ?? null;
}

export async function GET() {
  const speler = await getSpeler();
  if (!speler) return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });

  const admin = createAdminClient();
  const { data: sessie } = await admin
    .from("player_sessions")
    .select("*, route:routes(id, name)")
    .eq("player_id", speler.id)
    .eq("status", "actief")
    .maybeSingle();

  return NextResponse.json(sessie ?? null);
}

export async function POST() {
  const speler = await getSpeler();
  if (!speler) return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });

  const admin = createAdminClient();

  // Actieve route ophalen
  const { data: route } = await admin
    .from("routes")
    .select("id")
    .eq("is_active", true)
    .maybeSingle();

  if (!route) {
    return NextResponse.json({ fout: "Er is momenteel geen actieve route" }, { status: 400 });
  }

  // Controleer bestaande actieve sessie
  const { data: bestaand } = await admin
    .from("player_sessions")
    .select("id")
    .eq("player_id", speler.id)
    .eq("status", "actief")
    .maybeSingle();

  if (bestaand) {
    return NextResponse.json({ fout: "Er is al een actieve sessie" }, { status: 409 });
  }

  // Nieuwe sessie aanmaken
  const { data: sessie, error } = await admin
    .from("player_sessions")
    .insert({
      player_id: speler.id,
      route_id: route.id,
      started_at: new Date().toISOString(),
      status: "actief",
      score: 0,
    })
    .select()
    .single();

  if (error || !sessie) {
    return NextResponse.json({ fout: error?.message ?? "Sessie aanmaken mislukt" }, { status: 500 });
  }

  return NextResponse.json(sessie);
}
