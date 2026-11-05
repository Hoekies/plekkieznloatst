import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { meespeelSleutelKlopt } from "@/lib/meespelen";
import { meespeelData } from "@/lib/meespelen-server";
import { serverFout } from "@/lib/server-fout";

export const dynamic = "force-dynamic";

// 🤝 Gegevens voor de meespeellink, zonder inloggen: alleen met de juiste sleutel van dit spel
export async function GET(_: Request, { params }: { params: { sessie: string; sleutel: string } }) {
  if (!meespeelSleutelKlopt(params.sessie, params.sleutel)) return NextResponse.json({ fout: "Deze link werkt niet" }, { status: 404 });
  try {
    const data = await meespeelData(createAdminClient(), params.sessie);
    if (!data) return NextResponse.json({ fout: "Dit spel bestaat niet meer" }, { status: 404 });
    return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return serverFout(e instanceof Error ? e : { message: String(e) }, "/api/meespelen");
  }
}
