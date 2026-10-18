import { NextRequest, NextResponse } from "next/server";
import { haalGebruiker, isAdmin } from "@/lib/auth-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { helperNaarEmail } from "@/lib/login-naam";
import { maakWachtwoord } from "@/lib/speler-aanmaken";
import { versleutel, ontsleutel } from "@/lib/wachtwoord-kluis";

// Helpers van de spelleider: inloggen met een naam en wachtwoord, en dan alleen meekijken,
// foto's keuren en punten vrijgeven. Alleen de beheerder maakt ze aan en haalt ze weg.
async function checkAdmin() {
  return isAdmin(await haalGebruiker());
}

async function alleHelpers(admin: ReturnType<typeof createAdminClient>) {
  const { data } = await admin.auth.admin.listUsers({ perPage: 1000 });
  return (data?.users ?? []).filter((u) => u.app_metadata?.rol === "helper");
}

export async function GET(request: NextRequest) {
  if (!await checkAdmin()) return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });
  // ?id=…: het huidige wachtwoord van die helper (versleutelde kopie), voor opnieuw versturen
  const id = request.nextUrl.searchParams.get("id");
  if (id) {
    const { data } = await createAdminClient().auth.admin.getUserById(id);
    if (data?.user?.app_metadata?.rol !== "helper") return NextResponse.json({ fout: "Helper niet gevonden" }, { status: 404 });
    return NextResponse.json({ wachtwoord: ontsleutel(data.user.user_metadata?.ww as string | undefined) });
  }
  const helpers = await alleHelpers(createAdminClient());
  return NextResponse.json({
    helpers: helpers
      .map((u) => ({ id: u.id, naam: (u.user_metadata?.naam as string | undefined) ?? u.email?.split("@")[0] ?? "helper", laatst_ingelogd: u.last_sign_in_at ?? null }))
      .sort((a, b) => a.naam.localeCompare(b.naam)),
  });
}

// Gekozen wachtwoord (minimaal 8 tekens), of een makkelijk voorstel als er niets is meegestuurd
function kiesWachtwoord(waarde: unknown): string | null {
  if (waarde === undefined || waarde === null || waarde === "") return maakWachtwoord();
  return typeof waarde === "string" && waarde.trim().length >= 8 ? waarde.trim() : null;
}

// Nieuw wachtwoord voor een helper: PATCH {id, wachtwoord?}
export async function PATCH(request: NextRequest) {
  if (!await checkAdmin()) return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });
  const body = await request.json().catch(() => null);
  if (typeof body?.id !== "string") return NextResponse.json({ fout: "id ontbreekt" }, { status: 400 });
  const wachtwoord = kiesWachtwoord(body.wachtwoord);
  if (!wachtwoord) return NextResponse.json({ fout: "Wachtwoord: minimaal 8 tekens" }, { status: 400 });
  const admin = createAdminClient();
  const { data } = await admin.auth.admin.getUserById(body.id);
  if (data?.user?.app_metadata?.rol !== "helper") return NextResponse.json({ fout: "Helper niet gevonden" }, { status: 404 });
  const { error } = await admin.auth.admin.updateUserById(body.id, { password: wachtwoord, user_metadata: { ...data.user.user_metadata, ww: versleutel(wachtwoord) } });
  if (error) return NextResponse.json({ fout: error.message }, { status: 500 });
  return NextResponse.json({ naam: data.user.user_metadata?.naam ?? "", wachtwoord });
}

// Nieuwe helper: POST {naam, wachtwoord?}; het wachtwoord komt één keer terug
export async function POST(request: NextRequest) {
  if (!await checkAdmin()) return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });
  const body = await request.json().catch(() => null);
  const admin = createAdminClient();
  const wachtwoord = kiesWachtwoord(body?.wachtwoord);
  if (!wachtwoord) return NextResponse.json({ fout: "Wachtwoord: minimaal 8 tekens" }, { status: 400 });

  const naam = typeof body?.naam === "string" ? body.naam.trim() : "";
  if (!/^[A-Za-z0-9]{2,30}$/.test(naam)) {
    return NextResponse.json({ fout: "Naam: 2 tot 30 letters of cijfers, zonder spaties" }, { status: 400 });
  }
  // Spelers en helpers loggen allebei in met alleen een naam: die mag niet dubbel zijn
  const { data: speler } = await admin.from("players").select("id").ilike("login_name", naam).maybeSingle();
  if (speler) return NextResponse.json({ fout: "Er is al een speler met deze naam" }, { status: 400 });

  const { error } = await admin.auth.admin.createUser({
    email: helperNaarEmail(naam),
    password: wachtwoord,
    email_confirm: true,
    app_metadata: { rol: "helper" },
    user_metadata: { naam, ww: versleutel(wachtwoord) },
  });
  if (error) {
    const dubbel = /already|registered|exists/i.test(error.message);
    return NextResponse.json({ fout: dubbel ? "Er is al een helper met deze naam" : error.message }, { status: 400 });
  }
  return NextResponse.json({ naam, wachtwoord });
}

export async function DELETE(request: NextRequest) {
  if (!await checkAdmin()) return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });
  const body = await request.json().catch(() => null);
  if (typeof body?.id !== "string") return NextResponse.json({ fout: "id ontbreekt" }, { status: 400 });
  const admin = createAdminClient();
  const { data } = await admin.auth.admin.getUserById(body.id);
  if (data?.user?.app_metadata?.rol !== "helper") return NextResponse.json({ fout: "Helper niet gevonden" }, { status: 404 });
  // Pushmeldingen naar dit toestel stoppen
  await admin.from("push_abonnementen").delete().eq("user_id", body.id);
  const { error } = await admin.auth.admin.deleteUser(body.id);
  if (error) return NextResponse.json({ fout: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
