import { NextRequest, NextResponse } from "next/server";
import { haalGebruiker, isAdmin } from "@/lib/auth-server";
import { createAdminClient } from "@/lib/supabase-admin";

// Spel pauzeren (POST { pauze: true }) of verder laten gaan ({ pauze: false }).
// Bij verder gaan schuift de eindtijd precies zo lang op als de pauze duurde.
export async function POST(request: NextRequest) {
  if (!isAdmin(await haalGebruiker())) return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });
  const body = await request.json().catch(() => null);
  const pauze = !!body?.pauze;

  const admin = createAdminClient();
  const { data: route } = await admin.from("routes").select("*").eq("is_active", true).maybeSingle();
  if (!route) return NextResponse.json({ fout: "Er is geen actieve route" }, { status: 400 });
  const r = route as { id: string; eindtijd?: string | null; gepauzeerd_sinds?: string | null };

  let wijziging: Record<string, string | null>;
  if (pauze) {
    if (r.gepauzeerd_sinds) return NextResponse.json({ ok: true, pauze: r.gepauzeerd_sinds });
    wijziging = { gepauzeerd_sinds: new Date().toISOString() };
  } else {
    if (!r.gepauzeerd_sinds) return NextResponse.json({ ok: true, pauze: null });
    wijziging = { gepauzeerd_sinds: null };
    if (r.eindtijd) {
      const duur = Date.now() - new Date(r.gepauzeerd_sinds).getTime();
      wijziging.eindtijd = new Date(new Date(r.eindtijd).getTime() + Math.max(0, duur)).toISOString();
    }
  }
  const { error } = await admin.from("routes").update(wijziging).eq("id", r.id);
  if (error) {
    const migratie = /gepauzeerd_sinds/.test(error.message);
    return NextResponse.json({ fout: migratie ? "Draai eerst SQL-bestand 010 in Supabase" : error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, pauze: wijziging.gepauzeerd_sinds, eindtijd: wijziging.eindtijd ?? r.eindtijd ?? null });
}
