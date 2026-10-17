import { NextRequest, NextResponse } from "next/server";
import { haalGebruiker } from "@/lib/auth-server";
import { createAdminClient } from "@/lib/supabase-admin";

// De wachttijd van een spook of plek zooi met 30 seconden inkorten (de organisatie helpt een team).
// De app van het team ziet de nieuwe eindtijd binnen een paar seconden.
const STAP_MS = 30 * 1000;

export async function POST(_: NextRequest, { params }: { params: { id: string } }) {
  const user = await haalGebruiker();
  if (user?.app_metadata?.rol !== "admin") return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });
  if (!/^[0-9a-f-]{36}$/i.test(params.id)) return NextResponse.json({ fout: "Ongeldig id" }, { status: 400 });

  const admin = createAdminClient();
  const { data: effect } = await admin
    .from("special_item_effects")
    .select("id, effect_type, expires_at")
    .eq("id", params.id)
    .in("effect_type", ["ghost", "plekzooi"])
    .maybeSingle();
  if (!effect?.expires_at) return NextResponse.json({ fout: "Dit effect bestaat niet (meer)" }, { status: 404 });

  const nu = Date.now();
  const nieuw = Math.max(nu, new Date(effect.expires_at).getTime() - STAP_MS);
  const { error } = await admin.from("special_item_effects").update({ expires_at: new Date(nieuw).toISOString() }).eq("id", effect.id);
  if (error) return NextResponse.json({ fout: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, tot: new Date(nieuw).toISOString(), voorbij: nieuw <= nu });
}
