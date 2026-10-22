import { NextRequest, NextResponse } from "next/server";
import { haalGebruiker, isAdmin } from "@/lib/auth-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { bewaarWachtwoord, ontsleutel } from "@/lib/wachtwoord-kluis";
import { maakWachtwoord } from "@/lib/wachtwoord";

// 🖨️ Alle kaartjes: de inloggegevens van alle actieve spelers in één keer (om te printen of te versturen).
// Spelers van wie het wachtwoord niet bewaard is (van vóór migratie 011): bij { nieuw: true } krijgen
// die een nieuw wachtwoord, anders worden ze alleen geteld.
export async function POST(request: NextRequest) {
  if (!isAdmin(await haalGebruiker())) return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });
  const body = await request.json().catch(() => ({}));
  const admin = createAdminClient();
  const { data, error } = await admin.from("players").select("*").eq("is_uitgeschakeld", false).not("login_name", "is", null).order("login_name");
  if (error) return NextResponse.json({ fout: error.message }, { status: 500 });

  type Rij = { id: string; auth_user_id: string; login_name: string; nickname: string | null; telefoon?: string | null; wachtwoord_versleuteld?: string | null };
  const inlogs: { login: string; wachtwoord: string; naam: string | null; telefoon: string | null }[] = [];
  const onbekend: string[] = [];
  for (const p of (data ?? []) as Rij[]) {
    let wachtwoord = ontsleutel(p.wachtwoord_versleuteld);
    if (!wachtwoord && body?.nieuw === true) {
      const nieuw = maakWachtwoord();
      const { error: fout } = await admin.auth.admin.updateUserById(p.auth_user_id, { password: nieuw });
      if (!fout) { await bewaarWachtwoord(admin, p.id, nieuw); wachtwoord = nieuw; }
    }
    if (wachtwoord) inlogs.push({ login: p.login_name, wachtwoord, naam: p.nickname, telefoon: p.telefoon ?? null });
    else onbekend.push(p.nickname ?? p.login_name);
  }
  return NextResponse.json({ inlogs, onbekend });
}
