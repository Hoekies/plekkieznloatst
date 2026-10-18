import { NextRequest, NextResponse } from "next/server";
import { haalGebruiker, isAdmin } from "@/lib/auth-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { maakLinkCode, hashLinkCode, LINK_UREN } from "@/lib/inlog-link";

// Inloglink maken (POST { uren }) of alle links van dit team intrekken (DELETE)
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  if (!isAdmin(await haalGebruiker())) return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });
  if (!/^[0-9a-f-]{36}$/i.test(params.id)) return NextResponse.json({ fout: "Ongeldig id" }, { status: 400 });
  const body = await request.json().catch(() => null);
  const uren = Number(body?.uren);
  if (!(LINK_UREN as readonly number[]).includes(uren)) return NextResponse.json({ fout: "Kies hoe lang de link geldig is" }, { status: 400 });

  const admin = createAdminClient();
  const { data: speler } = await admin.from("players").select("id, login_name, is_uitgeschakeld").eq("id", params.id).maybeSingle();
  if (!speler) return NextResponse.json({ fout: "Speler niet gevonden" }, { status: 404 });
  if (speler.is_uitgeschakeld) return NextResponse.json({ fout: "Deze speler staat uit: zet hem eerst aan" }, { status: 400 });

  const code = maakLinkCode();
  const geldigTot = new Date(Date.now() + uren * 3600_000).toISOString();
  const { error } = await admin.from("inlog_links").insert({ player_id: speler.id, token_hash: hashLinkCode(code), geldig_tot: geldigTot });
  if (error) {
    const migratie = /inlog_links/.test(error.message);
    return NextResponse.json({ fout: migratie ? "Draai eerst SQL-bestand 008 in Supabase" : error.message }, { status: 500 });
  }
  // Zelfde adres als waar de beheerder nu werkt (live site, of lokaal bij het testen)
  return NextResponse.json({ url: `${new URL(request.url).origin}/l/${code}`, geldig_tot: geldigTot, login: speler.login_name });
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  if (!isAdmin(await haalGebruiker())) return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });
  if (!/^[0-9a-f-]{36}$/i.test(params.id)) return NextResponse.json({ fout: "Ongeldig id" }, { status: 400 });
  const admin = createAdminClient();
  const { error } = await admin.from("inlog_links").update({ ingetrokken: true }).eq("player_id", params.id).eq("ingetrokken", false);
  if (error) return NextResponse.json({ fout: error.message }, { status: 500 });
  // Wie via een link is ingelogd, wordt binnen een halve minuut uitgelogd (device-check)
  const { data: speler } = await admin.from("players").select("*").eq("id", params.id).maybeSingle();
  if ((speler as { toegang_tot?: string | null } | null)?.toegang_tot) {
    await admin.from("players").update({ toegang_tot: new Date().toISOString() }).eq("id", params.id);
  }
  return NextResponse.json({ ok: true });
}
