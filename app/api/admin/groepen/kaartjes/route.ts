import { NextRequest, NextResponse } from "next/server";
import { haalGebruiker, isAdmin } from "@/lib/auth-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { bewaarWachtwoord, ontsleutel } from "@/lib/wachtwoord-kluis";
import { maakWachtwoord } from "@/lib/wachtwoord";
import { willekeurigIcoon } from "@/lib/team-iconen";
import { maakLinkCode, hashLinkCode } from "@/lib/inlog-link";

// QR-code op het kaartje = direct inloggen; zo lang werkt de link (en de toegang die hij geeft)
const LINK_UREN = 48;

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
  const inlogs: { login: string; wachtwoord: string; naam: string | null; telefoon: string | null; link: { url: string; geldig_tot: string } | null }[] = [];
  const origin = new URL(request.url).origin;
  const geldigTot = new Date(Date.now() + LINK_UREN * 3600_000).toISOString();
  const onbekend: string[] = [];
  // 🔁 Nieuwe groep (na het afronden): dezelfde logins, maar alles van de vorige groep eraf
  const nieuweGroep = body?.nieuweGroep === true;
  for (const p of (data ?? []) as Rij[]) {
    if (nieuweGroep) {
      // De oude QR-kaartjes (inloglinks) eerst intrekken: die werken los van het wachtwoord, dus anders kon
      // iemand van de vorige groep er nog mee in het account van de nieuwe groep. De vorige groep wordt ook
      // uitgelogd: elk toestel dat vóór nu inlogde, wordt geweigerd (lib/inlog-moment.ts); de nieuwe groep
      // logt daarna gewoon in. Icoon terug naar het standaardicoon (de kolom mag niet leeg zijn).
      const [{ error: intrekFout }, { error: profielFout }] = await Promise.all([
        admin.from("inlog_links").update({ ingetrokken: true }).eq("player_id", p.id).eq("ingetrokken", false),
        admin.from("players").update({ nickname: null, icon: willekeurigIcoon(), telefoon: null, active_device_id: null, toegang_tot: null, force_logout_at: new Date().toISOString() }).eq("id", p.id),
      ]);
      if (intrekFout || profielFout) {
        return NextResponse.json({ fout: `Nieuwe groep voorbereiden lukte niet bij ${p.nickname ?? p.login_name}: ${(intrekFout ?? profielFout)!.message}` }, { status: 500 });
      }
      p.nickname = null; p.telefoon = null;
    }
    let wachtwoord = nieuweGroep ? null : ontsleutel(p.wachtwoord_versleuteld);
    if (!wachtwoord && (body?.nieuw === true || nieuweGroep)) {
      const nieuw = maakWachtwoord();
      const { error: fout } = await admin.auth.admin.updateUserById(p.auth_user_id, { password: nieuw });
      if (!fout) { await bewaarWachtwoord(admin, p.id, nieuw); wachtwoord = nieuw; }
    }
    if (wachtwoord) {
      // Inloglink voor de QR-code (migratie 008); lukt dat niet, dan wijst de QR-code naar de inlogpagina
      const code = maakLinkCode();
      const { error: linkFout } = await admin.from("inlog_links").insert({ player_id: p.id, token_hash: hashLinkCode(code), geldig_tot: geldigTot });
      inlogs.push({ login: p.login_name, wachtwoord, naam: p.nickname, telefoon: p.telefoon ?? null, link: linkFout ? null : { url: `${origin}/l/${code}`, geldig_tot: geldigTot } });
    }
    else onbekend.push(p.nickname ?? p.login_name);
  }
  return NextResponse.json({ inlogs, onbekend });
}
