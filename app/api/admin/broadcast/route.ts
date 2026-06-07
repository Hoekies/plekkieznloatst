import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.app_metadata?.rol !== "admin") {
    return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });
  }

  const { bericht } = await request.json();
  if (!bericht || typeof bericht !== "string" || !bericht.trim()) {
    return NextResponse.json({ fout: "Bericht ontbreekt" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("broadcasts")
    .insert({ bericht: bericht.trim().slice(0, 150) });

  if (error) return NextResponse.json({ fout: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
