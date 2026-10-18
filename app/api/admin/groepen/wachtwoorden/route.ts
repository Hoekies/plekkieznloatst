import { NextRequest, NextResponse } from "next/server";
import { haalGebruiker } from "@/lib/auth-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { maakWachtwoord } from "@/lib/speler-aanmaken";

// Inloggegevens uitdelen: voor de gekozen spelers een nieuw, makkelijk wachtwoord maken.
// Wachtwoorden worden nergens leesbaar bewaard; daarom maken we ze nieuw op het moment van uitdelen.
// Wie al is ingelogd, blijft ingelogd.
export async function POST(request: NextRequest) {
  const user = await haalGebruiker();
  if (user?.app_metadata?.rol !== "admin") return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });

  const body = await request.json().catch(() => null);
  const ids: string[] = Array.isArray(body?.ids) ? body.ids.filter((x: unknown) => typeof x === "string" && /^[0-9a-f-]{36}$/i.test(x)) : [];
  if (!ids.length) return NextResponse.json({ fout: "Kies minstens één speler" }, { status: 400 });

  const admin = createAdminClient();
  const { data: spelers } = await admin.from("players").select("id, auth_user_id, login_name, nickname").in("id", ids).order("login_name");

  const resultaat: { id: string; login: string; naam: string | null; wachtwoord: string }[] = [];
  for (const s of spelers ?? []) {
    const wachtwoord = maakWachtwoord();
    const { error } = await admin.auth.admin.updateUserById(s.auth_user_id, { password: wachtwoord });
    if (!error) resultaat.push({ id: s.id, login: s.login_name ?? "", naam: s.nickname ?? null, wachtwoord });
  }
  return NextResponse.json({ spelers: resultaat });
}
