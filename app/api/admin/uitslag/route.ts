import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { laatItemsVervallen } from "@/lib/items-vervallen";

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

  // Uitslag vrij: gefinishte teams kunnen niets meer inzetten, overgebleven items vervallen
  if (vrij) {
    const { data: klaar } = await admin.from("player_sessions").select("id").eq("route_id", data.id).eq("status", "voltooid");
    await laatItemsVervallen(admin, (klaar ?? []).map((s) => s.id));
  }
  return NextResponse.json({ ok: true, vrij: !!vrij });
}
