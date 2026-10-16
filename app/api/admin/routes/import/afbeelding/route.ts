import { NextRequest, NextResponse } from "next/server";
import { haalGebruiker } from "@/lib/auth-server";
import { createAdminClient } from "@/lib/supabase-admin";

// Eén afbeelding uit een geëxporteerde route terugzetten in de opslag, onder hetzelfde pad,
// zodat de verwijzingen in de route blijven kloppen. Staat hij er al (zelfde project), dan is dat goed.
const BUCKETS = ["route-afbeeldingen", "vraag-afbeeldingen"];
const TYPES = ["image/jpeg", "image/png", "image/webp"];

export async function POST(request: NextRequest) {
  const user = await haalGebruiker();
  if (!user || user.app_metadata?.rol !== "admin") return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });

  const body = await request.json().catch(() => null);
  const sleutel = typeof body?.sleutel === "string" ? body.sleutel : "";
  const [bucket, ...rest] = sleutel.split("/");
  const pad = rest.join("/");
  if (!BUCKETS.includes(bucket) || !/^[\w-]+\.(jpg|jpeg|png|webp)$/i.test(pad)) {
    return NextResponse.json({ fout: "Ongeldige afbeelding" }, { status: 400 });
  }
  if (!TYPES.includes(body?.type) || typeof body?.data !== "string") {
    return NextResponse.json({ fout: "Ongeldig bestandstype" }, { status: 400 });
  }
  const buffer = Buffer.from(body.data, "base64");
  if (buffer.length > 2 * 1024 * 1024) return NextResponse.json({ fout: "Afbeelding te groot" }, { status: 400 });

  const admin = createAdminClient();
  const { error } = await admin.storage.from(bucket).upload(pad, buffer, { contentType: body.type, upsert: false });
  if (error && !/exist|duplicate/i.test(error.message)) return NextResponse.json({ fout: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
