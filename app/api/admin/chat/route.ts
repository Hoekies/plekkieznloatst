import { NextRequest, NextResponse } from "next/server";
import { haalGebruiker, isBeheer } from "@/lib/auth-server";
import { createAdminClient } from "@/lib/supabase-admin";

// 💬 Chat met een team voor de spelleider (en helpers). GET ?sessie_id= = het gesprek (de berichten van het team
// worden als gelezen gemarkeerd); POST { sessie_id, tekst } = antwoorden.
export async function GET(request: NextRequest) {
  if (!isBeheer(await haalGebruiker())) return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });
  const sessieId = request.nextUrl.searchParams.get("sessie_id") ?? "";
  const admin = createAdminClient();
  await admin.from("chat_berichten").update({ gelezen_op: new Date().toISOString() }).eq("sessie_id", sessieId).eq("van", "team").is("gelezen_op", null);
  const { data, error } = await admin.from("chat_berichten").select("id, van, tekst, created_at, gelezen_op").eq("sessie_id", sessieId).order("created_at").limit(200);
  if (error) return NextResponse.json({ fout: "Draai eerst migratie 009 (spelplezier deel 2) in Supabase" }, { status: 500 });
  return NextResponse.json({ berichten: data ?? [] });
}

export async function POST(request: NextRequest) {
  if (!isBeheer(await haalGebruiker())) return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });
  const body = await request.json().catch(() => ({})) as { sessie_id?: string; tekst?: string };
  const tekst = typeof body.tekst === "string" ? body.tekst.trim().slice(0, 300) : "";
  if (!tekst || !body.sessie_id) return NextResponse.json({ fout: "Typ eerst een bericht" }, { status: 400 });
  const admin = createAdminClient();
  const { error } = await admin.from("chat_berichten").insert({ sessie_id: body.sessie_id, van: "leider", tekst });
  if (error) return NextResponse.json({ fout: "Versturen lukte niet" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
