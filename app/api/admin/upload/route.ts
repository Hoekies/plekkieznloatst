import { NextRequest, NextResponse } from "next/server";
import { haalGebruiker, isAdmin } from "@/lib/auth-server";
import { createAdminClient } from "@/lib/supabase-admin";

const TOEGESTANE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 500 * 1024; // 500 KB
// Geluidsfragmenten bij vragen (map "vraag-geluid")
const GELUID_TYPES: Record<string, string> = { "audio/mpeg": "mp3", "audio/mp3": "mp3", "audio/mp4": "m4a", "audio/x-m4a": "m4a", "audio/aac": "aac", "audio/wav": "wav", "audio/x-wav": "wav", "audio/ogg": "ogg", "audio/webm": "webm" };
const MAX_GELUID_BYTES = 3 * 1024 * 1024; // 3 MB

export async function POST(request: NextRequest) {
  const TOEGESTANE_BUCKETS = ["route-afbeeldingen", "vraag-afbeeldingen", "vraag-geluid"];

  const user = await haalGebruiker();
  if (!isAdmin(user)) {
    return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });
  }

  const formData = await request.formData();
  const bestand = formData.get("bestand") as File | null;
  const bucket = formData.get("bucket") as string | null;

  if (!bestand || !bucket) {
    return NextResponse.json({ fout: "Bestand of bucket ontbreekt" }, { status: 400 });
  }
  if (!TOEGESTANE_BUCKETS.includes(bucket)) {
    return NextResponse.json({ fout: "Ongeldig opslaglocatie" }, { status: 400 });
  }
  const geluid = bucket === "vraag-geluid";
  if (geluid ? !GELUID_TYPES[bestand.type] : !TOEGESTANE_TYPES.includes(bestand.type)) {
    return NextResponse.json({ fout: geluid ? "Alleen mp3, m4a, wav, ogg of webm" : "Alleen jpg, png en webp zijn toegestaan" }, { status: 400 });
  }
  if (bestand.size > (geluid ? MAX_GELUID_BYTES : MAX_BYTES)) {
    return NextResponse.json({ fout: geluid ? "Geluidsfragment is te groot (max 3 MB)" : "Bestand is te groot (max 500 KB na compressie)" }, { status: 400 });
  }

  const admin = createAdminClient();
  const ext = geluid ? GELUID_TYPES[bestand.type] : bestand.type === "image/png" ? "png" : bestand.type === "image/webp" ? "webp" : "jpg";
  const pad = `${crypto.randomUUID()}.${ext}`;
  const buffer = Buffer.from(await bestand.arrayBuffer());

  const { error } = await admin.storage.from(bucket).upload(pad, buffer, {
    contentType: bestand.type,
    upsert: false,
  });

  if (error) return NextResponse.json({ fout: error.message }, { status: 500 });

  return NextResponse.json({ pad });
}
