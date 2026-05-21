import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";

// GET — alle groepen ophalen
export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.user_metadata?.rol !== "admin") {
    return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin.from("players").select("*").order("created_at");
  if (error) return NextResponse.json({ fout: error.message }, { status: 500 });

  return NextResponse.json(data);
}

// POST — nieuwe groep aanmaken
export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.user_metadata?.rol !== "admin") {
    return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });
  }

  const { groepNaam, email, wachtwoord } = await request.json();

  if (!groepNaam?.trim() || !email?.trim() || !wachtwoord?.trim()) {
    return NextResponse.json({ fout: "Vul alle velden in" }, { status: 400 });
  }
  if (wachtwoord.length < 8) {
    return NextResponse.json({ fout: "Wachtwoord moet minimaal 8 tekens zijn" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Auth-gebruiker aanmaken
  const { data: authData, error: authFout } = await admin.auth.admin.createUser({
    email,
    password: wachtwoord,
    email_confirm: true,
    user_metadata: { rol: "speler" },
  });

  if (authFout || !authData.user) {
    const bericht = authFout?.message?.includes("already registered")
      ? "Dit e-mailadres is al in gebruik"
      : authFout?.message ?? "Kon gebruiker niet aanmaken";
    return NextResponse.json({ fout: bericht }, { status: 400 });
  }

  // Players-rij aanmaken
  const { data: speler, error: spelerFout } = await admin
    .from("players")
    .insert({ group_name: groepNaam.trim(), auth_user_id: authData.user.id })
    .select()
    .single();

  if (spelerFout) {
    // Auth-gebruiker opruimen als players insert mislukt
    await admin.auth.admin.deleteUser(authData.user.id);
    return NextResponse.json({ fout: spelerFout.message }, { status: 500 });
  }

  return NextResponse.json(speler, { status: 201 });
}
