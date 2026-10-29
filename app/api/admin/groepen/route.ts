import { NextRequest, NextResponse } from "next/server";
import { haalGebruiker, isAdmin } from "@/lib/auth-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { loginNaarEmail } from "@/lib/login-naam";
import { testRol } from "@/lib/testteam";
import { bewaarWachtwoord } from "@/lib/wachtwoord-kluis";

// GET — alle groepen ophalen
export async function GET() {
  const user = await haalGebruiker();
  if (!isAdmin(user)) {
    return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });
  }

  const admin = createAdminClient();
  const [{ data, error }, { data: lopend }] = await Promise.all([
    admin.from("players").select("*").order("created_at"),
    admin.from("player_sessions").select("player_id, status").in("status", ["actief", "voltooid"]),
  ]);
  if (error) return NextResponse.json({ fout: error.message }, { status: 500 });

  // Heeft de groep een lopend spel? (bepaalt of 'Spel stoppen' zichtbaar is)
  const metSpel = new Set((lopend ?? []).filter((s) => s.status === "actief").map((s) => s.player_id));
  // Gefinisht (en niet opnieuw bezig): voor de status-stip
  const klaar = new Set((lopend ?? []).filter((s) => s.status === "voltooid").map((s) => s.player_id));
  // De versleutelde wachtwoordkopie gaat niet mee naar de browser
  // 🧪 De testtegenstander is geen echt team: niet in de lijst
  return NextResponse.json((data ?? []).filter((g) => testRol(g) !== "tegenstander").map(({ wachtwoord_versleuteld: _ww, ...g }) => ({ ...g, heeft_spel: metSpel.has(g.id), gefinisht: !metSpel.has(g.id) && klaar.has(g.id) })));
}

// POST — nieuwe groep aanmaken
export async function POST(request: NextRequest) {
  const user = await haalGebruiker();
  if (!isAdmin(user)) {
    return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });
  }

  const { loginNaam, wachtwoord } = await request.json();

  if (!loginNaam?.trim() || !wachtwoord?.trim()) {
    return NextResponse.json({ fout: "Vul alle velden in" }, { status: 400 });
  }
  if (wachtwoord.length < 8) {
    return NextResponse.json({ fout: "Wachtwoord moet minimaal 8 tekens zijn" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Controleer of login_name al in gebruik is
  const { data: bestaand } = await admin.from("players").select("id").eq("login_name", loginNaam.trim()).maybeSingle();
  if (bestaand) return NextResponse.json({ fout: "Deze loginnaam is al in gebruik" }, { status: 400 });

  const internEmail = loginNaarEmail(loginNaam.trim());

  // Auth-gebruiker aanmaken
  const { data: authData, error: authFout } = await admin.auth.admin.createUser({
    email: internEmail,
    password: wachtwoord,
    email_confirm: true,
    app_metadata: { rol: "speler" },
  });

  if (authFout || !authData.user) {
    const bericht = authFout?.message?.includes("already registered")
      ? "Deze loginnaam is al in gebruik"
      : authFout?.message ?? "Kon gebruiker niet aanmaken";
    return NextResponse.json({ fout: bericht }, { status: 400 });
  }

  // Players-rij aanmaken
  const { data: speler, error: spelerFout } = await admin
    .from("players")
    // group_name is verplicht in de database maar wordt niet meer getoond; teams kiezen zelf een naam
    .insert({ group_name: loginNaam.trim(), login_name: loginNaam.trim(), auth_user_id: authData.user.id })
    .select()
    .single();

  if (spelerFout) {
    // Auth-gebruiker opruimen als players insert mislukt
    await admin.auth.admin.deleteUser(authData.user.id);
    return NextResponse.json({ fout: spelerFout.message }, { status: 500 });
  }

  await bewaarWachtwoord(admin, speler.id, wachtwoord);
  // De versleutelde kopie gaat niet mee naar de browser
  const { wachtwoord_versleuteld: _ww, ...zonder } = speler as Record<string, unknown>;
  return NextResponse.json(zonder, { status: 201 });
}
