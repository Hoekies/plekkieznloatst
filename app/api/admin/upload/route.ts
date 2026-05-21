import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";

const TOEGESTANE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 500 * 1024; // 500 KB

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user?.user_metadata?.rol !== "admin") {
    return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });
  }

  const formData = await request.formData();
  const bestand = formData.get("bestand") as File | null;
  const bucket = formData.get("bucket") as string | null;

  if (!bestand || !bucket) {
    return NextResponse.json({ fout: "Bestand of bucket ontbreekt" }, { status: 400 });
  }
  if (!TOEGESTANE_TYPES.includes(bestand.type)) {
    return NextResponse.json({ fout: "Alleen jpg, png en webp zijn toegestaan" }, { status: 400 });
  }
  if (bestand.size > MAX_BYTES) {
    return NextResponse.json({ fout: "Bestand is te groot (max 500 KB na compressie)" }, { status: 400 });
  }

  const admin = createAdminClient();
  const ext = bestand.type === "image/png" ? "png" : bestand.type === "image/webp" ? "webp" : "jpg";
  const pad = `${crypto.randomUUID()}.${ext}`;
  const buffer = Buffer.from(await bestand.arrayBuffer());

  const { error } = await admin.storage.from(bucket).upload(pad, buffer, {
    contentType: bestand.type,
    upsert: false,
  });

  if (error) return NextResponse.json({ fout: error.message }, { status: 500 });

  return NextResponse.json({ pad });
}
