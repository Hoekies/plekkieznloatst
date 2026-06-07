import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";

export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.app_metadata?.rol !== "admin") {
    return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });
  }

  const pad = request.nextUrl.searchParams.get("pad");
  if (!pad) return NextResponse.json({ fout: "pad ontbreekt" }, { status: 400 });

  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from("foto-inzendingen")
    .createSignedUrl(pad, 3600); // 1 uur geldig

  if (error) return NextResponse.json({ fout: error.message }, { status: 500 });

  return NextResponse.json({ url: data.signedUrl });
}
