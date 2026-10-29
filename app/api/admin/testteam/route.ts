import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { haalGebruiker, isAdmin } from "@/lib/auth-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { loginNaarEmail } from "@/lib/login-naam";
import { bewaarWachtwoord } from "@/lib/wachtwoord-kluis";
import { TEST_LOGIN, TEGENSTANDER_LOGIN, TEGENSTANDER_NAAM, testRol, gooiOpTestteam, testDuel, wisTest } from "@/lib/testteam";

// 🧪 Testteam (migratie 005). GET = staat het er, en speelt het? POST { actie: "maak" } = testteam en
// testtegenstander aanmaken · { actie: "gooi", type? } = de tegenstander gooit nu een item · { actie: "duel" } = de
// tegenstander daagt nu uit voor een duel · { actie: "opnieuw" } = test wissen
const MIGRATIE = "Draai eerst migratie 005 (testteam) in Supabase";

async function stand(admin: ReturnType<typeof createAdminClient>) {
  const { data: spelers } = await admin.from("players").select("*");
  const team = (spelers ?? []).find((p) => testRol(p) === "team") ?? null;
  const tegenstander = (spelers ?? []).find((p) => testRol(p) === "tegenstander") ?? null;
  const migratieKlaar = !spelers?.length || "test_rol" in spelers[0];
  const { data: sessie } = team
    ? await admin.from("player_sessions").select("id, route_id, score, player_id, status").eq("player_id", team.id).eq("status", "actief").maybeSingle()
    : { data: null };
  return { team, tegenstander, sessie, migratieKlaar };
}

export async function GET() {
  if (!isAdmin(await haalGebruiker())) return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });
  const { team, tegenstander, sessie, migratieKlaar } = await stand(createAdminClient());
  return NextResponse.json({ migratieKlaar, team: team ? { id: team.id, login_name: team.login_name } : null, tegenstander: !!tegenstander, speelt: !!sessie });
}

// Een speler met een inlogaccount aanmaken (zelfde als bij Spelers), met de testrol erbij
async function maakSpeler(admin: ReturnType<typeof createAdminClient>, login: string, rol: "team" | "tegenstander", naam: string | null) {
  const wachtwoord = randomBytes(6).toString("base64url");
  const { data: auth, error: authFout } = await admin.auth.admin.createUser({
    email: loginNaarEmail(login), password: wachtwoord, email_confirm: true, app_metadata: { rol: "speler" },
  });
  if (authFout || !auth.user) throw new Error(authFout?.message ?? "Inlogaccount maken lukte niet");
  const { data: speler, error } = await admin.from("players")
    .insert({ group_name: login, login_name: login, auth_user_id: auth.user.id, test_rol: rol, nickname: naam, icon: rol === "team" ? "🧪" : "🤖" })
    .select().single();
  if (error || !speler) { await admin.auth.admin.deleteUser(auth.user.id); throw new Error(/test_rol/.test(error?.message ?? "") ? MIGRATIE : error?.message ?? "Speler maken lukte niet"); }
  await bewaarWachtwoord(admin, speler.id, wachtwoord);
  return speler;
}

export async function POST(request: NextRequest) {
  if (!isAdmin(await haalGebruiker())) return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });
  const body = await request.json().catch(() => ({})) as { actie?: string; type?: string };
  const admin = createAdminClient();
  const nu = await stand(admin);
  if (!nu.migratieKlaar) return NextResponse.json({ fout: MIGRATIE }, { status: 400 });

  if (body.actie === "maak") {
    try {
      // Loginnaam al in gebruik door een echt team? Dan niet overschrijven
      const { data: bezet } = await admin.from("players").select("*").in("login_name", [TEST_LOGIN, TEGENSTANDER_LOGIN]);
      const echt = (bezet ?? []).find((p) => !testRol(p));
      if (echt) return NextResponse.json({ fout: `De loginnaam "${echt.login_name}" is al van een echt team` }, { status: 400 });
      if (!nu.team) await maakSpeler(admin, TEST_LOGIN, "team", null);
      if (!nu.tegenstander) await maakSpeler(admin, TEGENSTANDER_LOGIN, "tegenstander", TEGENSTANDER_NAAM);
      return NextResponse.json({ ok: true });
    } catch (e) {
      return NextResponse.json({ fout: (e as Error).message }, { status: 500 });
    }
  }
  if (body.actie === "gooi") {
    if (!nu.sessie) return NextResponse.json({ fout: "Het testteam speelt nu niet: start eerst een rondje met het testteam" }, { status: 409 });
    const uit = await gooiOpTestteam(admin, nu.sessie, body.type);
    return uit.ok ? NextResponse.json({ ok: true, type: uit.type }) : NextResponse.json({ fout: uit.fout }, { status: 400 });
  }
  if (body.actie === "duel") {
    if (!nu.sessie) return NextResponse.json({ fout: "Het testteam speelt nu niet: start eerst een rondje met het testteam" }, { status: 409 });
    const uit = await testDuel(admin, nu.sessie);
    return uit.ok ? NextResponse.json({ ok: true }) : NextResponse.json({ fout: uit.fout }, { status: 409 });
  }
  if (body.actie === "opnieuw") {
    const aantal = await wisTest(admin);
    return NextResponse.json({ ok: true, gewist: aantal });
  }
  return NextResponse.json({ fout: "Onbekende actie" }, { status: 400 });
}
