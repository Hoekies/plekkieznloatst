import { NextRequest, NextResponse } from "next/server";
import { haalGebruiker, isAdmin } from "@/lib/auth-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { laatItemsVervallen } from "@/lib/items-vervallen";
import { sluitStemmingen } from "@/lib/stemmen";
import { rekenPuzzelsAf } from "@/lib/puzzel-server";

// Uitslag van de actieve route vrijgeven (of weer verbergen). Spelers op het finishscherm
// zien de eindstand binnen ~10 seconden verschijnen.
export async function POST(request: NextRequest) {
  const user = await haalGebruiker();
  if (!isAdmin(user)) return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });

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
    // 🗳️ Open stemvragen sluiten: wie met de meerderheid meestemde krijgt de punten (vóór de stand zichtbaar wordt)
    await sluitStemmingen(admin, data.id);
    // 🧩 Puzzelwoord: punten per gevonden letter en de bonus, ook voor teams die het finishscherm niet openden
    await rekenPuzzelsAf(admin, data.id);
    const { data: klaar } = await admin.from("player_sessions").select("id").eq("route_id", data.id).eq("status", "voltooid");
    await laatItemsVervallen(admin, (klaar ?? []).map((s) => s.id));
  }
  return NextResponse.json({ ok: true, vrij: !!vrij });
}
