import { NextRequest, NextResponse } from "next/server";
import { haalGebruiker } from "@/lib/auth-server";
import { createAdminClient } from "@/lib/supabase-admin";

// Een fout uit de app (foutscherm) in het logboek zetten, zodat de beheerder hem in de Systeemcheck ziet.
// Zonder migratie 015 (geen tabel) gewoon niets bewaren.
export async function POST(request: NextRequest) {
  const user = await haalGebruiker();
  if (!user) return NextResponse.json({ ok: false }, { status: 403 });
  const body = await request.json().catch(() => null);
  const tekst = (v: unknown, max: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);
  const bericht = tekst(body?.bericht, 500);
  if (!bericht) return NextResponse.json({ ok: false }, { status: 400 });

  const admin = createAdminClient();
  const rol = user.app_metadata?.rol ?? "speler";
  let wie: string | null = null;
  if (rol !== "admin" && rol !== "helper") {
    const { data: speler } = await admin.from("players").select("display_name").eq("auth_user_id", user.id).maybeSingle();
    wie = speler?.display_name ?? null;
  }
  await admin.from("client_fouten").insert({
    rol, wie, bericht,
    pad: tekst(body?.pad, 200),
    details: tekst(body?.details, 3000),
    browser: request.headers.get("user-agent")?.slice(0, 300) ?? null,
  });
  return NextResponse.json({ ok: true });
}
