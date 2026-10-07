import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";

// Uitslag van de actieve route vrijgeven (of weer verbergen). Spelers op het finishscherm
// zien de eindstand binnen ~10 seconden verschijnen.
export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user?.app_metadata?.rol !== "admin") return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });

  const { vrij } = await request.json();
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("routes")
    .update({ uitslag_vrijgegeven: !!vrij })
    .eq("is_active", true)
    .select("id")
    .maybeSingle();
  if (error) return NextResponse.json({ fout: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ fout: "Er is geen actieve route" }, { status: 400 });
  return NextResponse.json({ ok: true, vrij: !!vrij });
}
