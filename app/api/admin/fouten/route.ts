import { NextRequest, NextResponse } from "next/server";
import { haalGebruiker, isAdmin } from "@/lib/auth-server";
import { createAdminClient } from "@/lib/supabase-admin";

// 🐞 Foutlogboek voor de Systeemcheck: de laatste fouten uit de app (GET), alles wissen (DELETE),
// of oude GPS-plekken en fouten (ouder dan 30 dagen) nu meteen opruimen (POST { opruimen: true }).
const MIGRATIE = "Draai eerst SQL-bestand 015 in Supabase";

export async function GET() {
  if (!isAdmin(await haalGebruiker())) return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });
  const { data, error } = await createAdminClient().from("client_fouten")
    .select("id, created_at, rol, wie, pad, bericht, details, browser").order("created_at", { ascending: false }).limit(30);
  if (error) return NextResponse.json({ fout: /client_fouten/.test(error.message) ? MIGRATIE : error.message }, { status: 500 });
  return NextResponse.json({ fouten: data });
}

export async function DELETE() {
  if (!isAdmin(await haalGebruiker())) return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });
  const { error } = await createAdminClient().from("client_fouten").delete().not("id", "is", null);
  if (error) return NextResponse.json({ fout: /client_fouten/.test(error.message) ? MIGRATIE : error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function POST(request: NextRequest) {
  if (!isAdmin(await haalGebruiker())) return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });
  const body = await request.json().catch(() => null);
  if (!body?.opruimen) return NextResponse.json({ fout: "Onbekende actie" }, { status: 400 });
  const admin = createAdminClient();
  const grens = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
  const { count, error } = await admin.from("location_updates").delete({ count: "exact" }).lt("created_at", grens);
  if (error) return NextResponse.json({ fout: error.message }, { status: 500 });
  await admin.from("client_fouten").delete().lt("created_at", grens);
  return NextResponse.json({ ok: true, plekken: count ?? 0 });
}
