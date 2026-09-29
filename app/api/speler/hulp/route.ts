import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { bepaalVolgendPunt } from "@/lib/volgend-punt";

async function getSessie() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const admin = createAdminClient();
  const { data: speler } = await admin.from("players").select("id").eq("auth_user_id", user.id).maybeSingle();
  if (!speler) return null;
  const { data: sessie } = await admin
    .from("player_sessions")
    .select("id, route_id")
    .eq("player_id", speler.id)
    .eq("status", "actief")
    .maybeSingle();
  return sessie ?? null;
}

// Status van de laatste melding van dit team
export async function GET() {
  const sessie = await getSessie();
  if (!sessie) return NextResponse.json({ fout: "Geen actieve sessie" }, { status: 403 });

  const admin = createAdminClient();
  const { data: laatste } = await admin
    .from("hulpverzoeken")
    .select("id, status, afgehandeld_at")
    .eq("session_id", sessie.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return NextResponse.json({
    id: laatste?.id ?? null,
    status: laatste?.status ?? null,
    afgehandeld_at: laatste?.afgehandeld_at ?? null,
  });
}

// Meld dat het volgende punt niet te bereiken is
export async function POST() {
  const sessie = await getSessie();
  if (!sessie) return NextResponse.json({ fout: "Geen actieve sessie" }, { status: 403 });

  const admin = createAdminClient();

  const { data: open } = await admin
    .from("hulpverzoeken")
    .select("id")
    .eq("session_id", sessie.id)
    .eq("status", "open")
    .maybeSingle();
  if (open) return NextResponse.json({ id: open.id, status: "open" });

  const punt = await bepaalVolgendPunt(admin, sessie);
  if (!punt) return NextResponse.json({ fout: "Er is geen volgend punt om te melden" }, { status: 400 });

  const { data, error } = await admin
    .from("hulpverzoeken")
    .insert({ session_id: sessie.id, route_point_id: punt.id })
    .select("id, status")
    .single();
  if (error) return NextResponse.json({ fout: error.message }, { status: 500 });

  return NextResponse.json(data);
}
