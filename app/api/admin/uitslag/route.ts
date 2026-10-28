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
  const { data: route, error: leesFout } = await admin.from("routes").select("id").eq("is_active", true).maybeSingle();
  if (leesFout) return NextResponse.json({ fout: leesFout.message }, { status: 500 });
  if (!route) return NextResponse.json({ fout: "Er is geen actieve route" }, { status: 400 });

  // Uitslag vrij: eerst alles afrekenen, pas daarna zichtbaar maken. Anders zagen teams even een eindstand
  // zonder stem- en puzzelpunten. Gefinishte teams kunnen daarna niets meer inzetten, overgebleven items vervallen.
  if (vrij) {
    try {
      // 🗳️ Open stemvragen sluiten: wie met de meerderheid meestemde krijgt de punten
      await sluitStemmingen(admin, route.id);
      // 🧩 Puzzelwoord: punten per gevonden letter en de bonus, ook voor teams die het finishscherm niet openden
      await rekenPuzzelsAf(admin, route.id);
      const { data: klaar } = await admin.from("player_sessions").select("id").eq("route_id", route.id).eq("status", "voltooid");
      await laatItemsVervallen(admin, (klaar ?? []).map((s) => s.id));
    } catch (e) {
      return NextResponse.json({ fout: `Afrekenen lukte niet: ${(e as Error).message}. De uitslag is nog niet vrijgegeven.` }, { status: 500 });
    }
  }
  const { error } = await admin.from("routes").update({ uitslag_vrijgegeven: !!vrij }).eq("id", route.id);
  if (error) return NextResponse.json({ fout: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, vrij: !!vrij });
}
