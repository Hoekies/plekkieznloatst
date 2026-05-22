import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";

export async function POST(request: NextRequest) {
  const { deviceId } = await request.json();
  if (!deviceId) return NextResponse.json({ fout: "Geen device ID" }, { status: 400 });

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ fout: "Niet ingelogd" }, { status: 401 });

  const admin = createAdminClient();
  const { data: speler } = await admin
    .from("players")
    .select("id, active_device_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!speler) return NextResponse.json({ fout: "Speler niet gevonden" }, { status: 404 });

  // Tweede apparaat blokkeren
  if (speler.active_device_id && speler.active_device_id !== deviceId) {
    // Uitloggen zodat de sessie niet open blijft
    await supabase.auth.signOut();
    return NextResponse.json(
      { fout: "Je groep is al actief op een ander apparaat. Sluit dat apparaat eerst af." },
      { status: 409 }
    );
  }

  // Device registreren of bevestigen
  await admin
    .from("players")
    .update({ active_device_id: deviceId })
    .eq("id", speler.id);

  return NextResponse.json({ ok: true });
}
