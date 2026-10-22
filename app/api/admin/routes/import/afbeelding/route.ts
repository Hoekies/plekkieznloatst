import { NextRequest, NextResponse } from "next/server";
import { haalGebruiker } from "@/lib/auth-server";
import { createAdminClient } from "@/lib/supabase-admin";

// Eén afbeelding (of geluidsfragment) uit een geëxporteerde route terugzetten in de opslag, onder hetzelfde pad,
// zodat de verwijzingen in de route blijven kloppen. Staat hij er al (zelfde project), dan is dat goed.
const BUCKETS = ["route-afbeeldingen", "vraag-afbeeldingen", "vraag-geluid"];
const TYPES = ["image/jpeg", "image/png", "image/webp"];
const GELUID_TYPES = ["audio/mpeg", "audio/mp3", "audio/mp4", "audio/x-m4a", "audio/aac", "audio/wav", "audio/x-wav", "audio/ogg", "audio/webm"];

export async function POST(request: NextRequest) {
  const user = await haalGebruiker();
  if (!user || user.app_metadata?.rol !== "admin") return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });

  const body = await request.json().catch(() => null);
  const sleutel = typeof body?.sleutel === "string" ? body.sleutel : "";
  const [bucket, ...rest] = sleutel.split("/");
  const pad = rest.join("/");
  const geluid = bucket === "vraag-geluid";
  if (!BUCKETS.includes(bucket) || !(geluid ? /^[\w-]+\.(mp3|m4a|aac|wav|ogg|webm)$/i : /^[\w-]+\.(jpg|jpeg|png|webp)$/i).test(pad)) {
    return NextResponse.json({ fout: "Ongeldig bestand" }, { status: 400 });
  }
  if (!(geluid ? GELUID_TYPES : TYPES).includes(body?.type) || typeof body?.data !== "string") {
    return NextResponse.json({ fout: "Ongeldig bestandstype" }, { status: 400 });
  }
  const buffer = Buffer.from(body.data, "base64");
  if (buffer.length > (geluid ? 3 : 2) * 1024 * 1024) return NextResponse.json({ fout: "Bestand te groot" }, { status: 400 });

  const admin = createAdminClient();
  const { error } = await admin.storage.from(bucket).upload(pad, buffer, { contentType: body.type, upsert: false });
  if (error && !/exist|duplicate/i.test(error.message)) return NextResponse.json({ fout: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
