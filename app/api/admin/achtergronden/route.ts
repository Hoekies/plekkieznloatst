import { NextRequest, NextResponse } from "next/server";
import { haalGebruiker, isAdmin } from "@/lib/auth-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { THEMAS } from "@/lib/seizoenen";

// 🗓️ Seizoensachtergronden (migratie 019): GET = welke er zijn, POST { thema, pad } = instellen, DELETE { thema } = weghalen
const MIGRATIE = "Draai eerst migratie 019 (seizoensachtergronden) in Supabase";
const geldigThema = (t: unknown) => typeof t === "string" && THEMAS.some((x) => x.sleutel === t);

export async function GET() {
  if (!isAdmin(await haalGebruiker())) return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });
  const { data, error } = await createAdminClient().from("seizoen_achtergronden").select("thema, pad");
  if (error) return NextResponse.json({ fout: /seizoen_achtergronden/.test(error.message) ? MIGRATIE : error.message }, { status: 500 });
  return NextResponse.json({ achtergronden: Object.fromEntries((data ?? []).map((r) => [r.thema, r.pad])) });
}

export async function POST(request: NextRequest) {
  if (!isAdmin(await haalGebruiker())) return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });
  const body = await request.json().catch(() => null);
  if (!geldigThema(body?.thema) || typeof body?.pad !== "string" || !/^[\w-]+\.(jpg|jpeg|png|webp)$/i.test(body.pad)) {
    return NextResponse.json({ fout: "Ongeldige achtergrond" }, { status: 400 });
  }
  const { error } = await createAdminClient().from("seizoen_achtergronden")
    .upsert({ thema: body.thema, pad: body.pad, updated_at: new Date().toISOString() }, { onConflict: "thema" });
  if (error) return NextResponse.json({ fout: /seizoen_achtergronden/.test(error.message) ? MIGRATIE : error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  if (!isAdmin(await haalGebruiker())) return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });
  const body = await request.json().catch(() => null);
  if (!geldigThema(body?.thema)) return NextResponse.json({ fout: "Onbekend thema" }, { status: 400 });
  const { error } = await createAdminClient().from("seizoen_achtergronden").delete().eq("thema", body.thema);
  if (error) return NextResponse.json({ fout: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
