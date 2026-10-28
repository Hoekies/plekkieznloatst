import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { inlogMoment, uitgelogdNaLogin } from "@/lib/inlog-moment";

export async function POST(request: NextRequest) {
  const { deviceId } = await request.json();
  if (!deviceId) return NextResponse.json({ fout: "Geen device ID" }, { status: 400 });

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ fout: "Niet ingelogd" }, { status: 401 });

  const admin = createAdminClient();
  const { data: speler } = await admin
    .from("players")
    // "*": toegang_tot (migratie 008) mag ontbreken zonder dat iedereen eruit vliegt
    .select("*")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!speler) return NextResponse.json({ fout: "Speler niet gevonden" }, { status: 404 });

  // Door de beheerder uitgelogd (of "Volgende groep"): alleen dit toestel als het van vóór dat moment is
  // ingelogd. Het tijdstip blijft staan, zodat ook andere oude toestellen er later nog uit gaan; wie daarna
  // opnieuw inlogt, heeft een nieuwer inlogmoment en mag verder.
  const { data: { session } } = await supabase.auth.getSession();
  if (uitgelogdNaLogin(speler.force_logout_at, inlogMoment(session?.access_token))) {
    await supabase.auth.signOut();
    return NextResponse.json({ fout: "Je bent door de beheerder uitgelogd.", reden: "uitgelogd" }, { status: 409 });
  }

  // Ingelogd via een inloglink en de tijd is om: uitloggen
  const toegangTot = (speler as { toegang_tot?: string | null }).toegang_tot;
  if (toegangTot && new Date(toegangTot).getTime() <= Date.now()) {
    await supabase.auth.signOut();
    await admin.from("players").update({ toegang_tot: null, active_device_id: null }).eq("id", speler.id);
    return NextResponse.json({ fout: "De tijd van je toegang is om.", reden: "verlopen" }, { status: 409 });
  }

  // Tweede apparaat blokkeren
  if (speler.active_device_id && speler.active_device_id !== deviceId) {
    // Uitloggen zodat de sessie niet open blijft
    await supabase.auth.signOut();
    return NextResponse.json(
      { fout: "Je bent al actief op een ander apparaat. Sluit dat apparaat eerst af.", reden: "apparaat" },
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
