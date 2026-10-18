import { NextRequest, NextResponse } from "next/server";
import { haalGebruiker, isAdmin } from "@/lib/auth-server";
import { createAdminClient } from "@/lib/supabase-admin";

// Route leegmaken: alle punten (met hun vragen) en alle items weg. De route zelf, de naam en
// de instellingen blijven. Niet bij de actieve route: daar kan een spel op lopen.
export async function POST(_: NextRequest, { params }: { params: { id: string } }) {
  if (!isAdmin(await haalGebruiker())) return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });
  if (!/^[0-9a-f-]{36}$/i.test(params.id)) return NextResponse.json({ fout: "Ongeldig id" }, { status: 400 });

  const admin = createAdminClient();
  const { data: route } = await admin.from("routes").select("id, is_active").eq("id", params.id).maybeSingle();
  if (!route) return NextResponse.json({ fout: "Route niet gevonden" }, { status: 404 });
  if (route.is_active) return NextResponse.json({ fout: "Deactiveer de route eerst: er kan een spel op lopen" }, { status: 400 });

  const { error: itemFout } = await admin.from("special_items").delete().eq("route_id", params.id);
  if (itemFout) return NextResponse.json({ fout: itemFout.message }, { status: 500 });
  const { error: puntFout } = await admin.from("route_points").delete().eq("route_id", params.id);
  if (puntFout) return NextResponse.json({ fout: puntFout.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
