import { NextRequest, NextResponse } from "next/server";
import { haalGebruiker } from "@/lib/auth-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { maakSpeler, maakWachtwoord } from "@/lib/speler-aanmaken";

// Meerdere spelers in één keer: voorvoegsel + volgnummer (bv. speler5 t/m speler12), elk met een
// makkelijk wachtwoord. Geeft de inloggegevens terug om meteen uit te delen.
export async function POST(request: NextRequest) {
  const user = await haalGebruiker();
  if (user?.app_metadata?.rol !== "admin") return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });

  const body = await request.json().catch(() => null);
  const aantal = Math.floor(Number(body?.aantal));
  const voorvoegsel = typeof body?.voorvoegsel === "string" ? body.voorvoegsel.trim().toLowerCase().replace(/[^a-z0-9]/g, "") : "";
  if (!voorvoegsel) return NextResponse.json({ fout: "Vul een naam in (alleen letters en cijfers)" }, { status: 400 });
  if (!(aantal >= 1 && aantal <= 30)) return NextResponse.json({ fout: "Kies 1 tot 30 spelers" }, { status: 400 });

  const admin = createAdminClient();
  // Eerstvolgende vrije nummers: bestaande loginnamen met dit voorvoegsel overslaan
  const { data: bestaand } = await admin.from("players").select("login_name").ilike("login_name", `${voorvoegsel}%`);
  const bezet = new Set((bestaand ?? []).map((p) => (p.login_name ?? "").toLowerCase()));

  const gemaakt: { id: string; login: string; wachtwoord: string }[] = [];
  let nummer = 1;
  while (gemaakt.length < aantal && nummer < 1000) {
    const login = `${voorvoegsel}${nummer++}`;
    if (bezet.has(login)) continue;
    const wachtwoord = maakWachtwoord();
    const r = await maakSpeler(admin, login, wachtwoord);
    if ("fout" in r) {
      if (r.status === 400) continue;  // toch bezet: volgende nummer
      return NextResponse.json({ fout: r.fout, gemaakt }, { status: r.status });
    }
    gemaakt.push({ id: r.speler.id, login, wachtwoord });
  }
  return NextResponse.json({ gemaakt });
}
