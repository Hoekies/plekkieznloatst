import { NextRequest, NextResponse } from "next/server";
import { haalGebruiker, isAdmin } from "@/lib/auth-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { THEMAS, SEIZOEN_KOLOM, VAST_SLEUTEL, bestaandThema, type SeizoenSoort } from "@/lib/seizoenen";

// 🗓️ Seizoensachtergronden (migratie 019) en -logo's (migratie 020).
// GET = welke er zijn per soort (en welk thema vastgezet is), POST { thema, soort, pad } = instellen,
// DELETE { thema, soort } = weghalen, PUT { vast } = thema vastzetten of weer automatisch
const MIGRATIE_019 = "Draai eerst migratie 019 (seizoensachtergronden) in Supabase";
const MIGRATIE_020 = "Draai eerst migratie 020 (seizoenslogo's) in Supabase";
const geldigThema = (t: unknown) => typeof t === "string" && THEMAS.some((x) => x.sleutel === t);
const geldigeSoort = (s: unknown): s is SeizoenSoort => typeof s === "string" && s in SEIZOEN_KOLOM;
const uitleg = (bericht: string) => /logo_pad|logo_breed_pad|null value in column "pad"/.test(bericht) ? MIGRATIE_020
  : /seizoen_achtergronden/.test(bericht) ? MIGRATIE_019 : bericht;

export async function GET() {
  if (!isAdmin(await haalGebruiker())) return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });
  const admin = createAdminClient();
  let { data, error } = await admin.from("seizoen_achtergronden").select("*");
  if (error) return NextResponse.json({ fout: uitleg(error.message) }, { status: 500 });
  data = data ?? [];
  // 📌 De regel van het vastgezette thema is geen afbeelding
  const vastRij = data.find((r) => r.thema === VAST_SLEUTEL);
  const vast = bestaandThema(vastRij?.pad) ? vastRij!.pad : null;
  const beelden = data.filter((r) => r.thema !== VAST_SLEUTEL);
  const paden = Object.fromEntries((Object.keys(SEIZOEN_KOLOM) as SeizoenSoort[]).map((soort) => [soort,
    Object.fromEntries(beelden.filter((r) => r[SEIZOEN_KOLOM[soort]]).map((r) => [r.thema, r[SEIZOEN_KOLOM[soort]]]))]));
  // Zonder migratie 020 ontbreken de logokolommen: achtergronden werken, logo's nog niet
  const logosKlaar = data.length === 0 || "logo_pad" in data[0];
  return NextResponse.json({ paden, logosKlaar, vast });
}

// 📌 PUT { vast: "kerst" } = dit thema overal vastzetten (achtergrond, logo's, finish); { vast: null } = weer op datum
export async function PUT(request: NextRequest) {
  if (!isAdmin(await haalGebruiker())) return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });
  const body = await request.json().catch(() => null);
  const admin = createAdminClient();
  if (body?.vast === null) {
    const { error } = await admin.from("seizoen_achtergronden").delete().eq("thema", VAST_SLEUTEL);
    if (error) return NextResponse.json({ fout: uitleg(error.message) }, { status: 500 });
    return NextResponse.json({ ok: true });
  }
  if (!bestaandThema(body?.vast)) return NextResponse.json({ fout: "Onbekend thema" }, { status: 400 });
  const { error } = await admin.from("seizoen_achtergronden")
    .upsert({ thema: VAST_SLEUTEL, pad: body.vast, updated_at: new Date().toISOString() }, { onConflict: "thema" });
  if (error) return NextResponse.json({ fout: uitleg(error.message) }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function POST(request: NextRequest) {
  if (!isAdmin(await haalGebruiker())) return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });
  const body = await request.json().catch(() => null);
  if (!geldigThema(body?.thema) || !geldigeSoort(body?.soort) || typeof body?.pad !== "string" || !/^[\w-]+\.(jpg|jpeg|png|webp)$/i.test(body.pad)) {
    return NextResponse.json({ fout: "Ongeldige afbeelding" }, { status: 400 });
  }
  const { error } = await createAdminClient().from("seizoen_achtergronden")
    .upsert({ thema: body.thema, [SEIZOEN_KOLOM[body.soort as SeizoenSoort]]: body.pad, updated_at: new Date().toISOString() }, { onConflict: "thema" });
  if (error) return NextResponse.json({ fout: uitleg(error.message) }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  if (!isAdmin(await haalGebruiker())) return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });
  const body = await request.json().catch(() => null);
  if (!geldigThema(body?.thema) || !geldigeSoort(body?.soort)) return NextResponse.json({ fout: "Onbekend thema" }, { status: 400 });
  const admin = createAdminClient();
  const kolom = SEIZOEN_KOLOM[body.soort as SeizoenSoort];
  // Alleen deze afbeelding weg; staat er daarna niets meer in, dan de hele regel
  const { error } = await admin.from("seizoen_achtergronden").update({ [kolom]: null }).eq("thema", body.thema);
  if (error) {
    // Zonder migratie 020 is de achtergrond verplicht (en het enige): dan de regel zelf weg
    if (kolom !== "pad" || !/null value in column "pad"/.test(error.message)) return NextResponse.json({ fout: uitleg(error.message) }, { status: 500 });
    await admin.from("seizoen_achtergronden").delete().eq("thema", body.thema);
  } else {
    await admin.from("seizoen_achtergronden").delete().eq("thema", body.thema).is("pad", null).is("logo_pad", null).is("logo_breed_pad", null);
  }
  return NextResponse.json({ ok: true });
}
