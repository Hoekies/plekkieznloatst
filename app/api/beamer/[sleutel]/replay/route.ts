import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { haalLiveData } from "@/lib/admin-live";
import { beamerSleutel, beamerSpelers } from "@/lib/beamer";
import { haalReplay } from "@/lib/beamer-replay";

// 🎬 Replay voor het beamerscherm: de gelopen sporen van alle teams, pas na het vrijgeven van de uitslag
export async function GET(_: NextRequest, { params }: { params: { sleutel: string } }) {
  const data = await haalLiveData();
  if (!data.route || params.sleutel !== await beamerSleutel(data.route.id)) {
    return NextResponse.json({ fout: "Deze link werkt niet (meer): vraag de spelleider om de nieuwe link" }, { status: 404 });
  }
  if (!data.route.uitslag_vrijgegeven) return NextResponse.json({ fout: "De replay komt na het vrijgeven van de uitslag" }, { status: 409 });
  const teams = beamerSpelers(data.spelers).filter((s) => s.sessie_id).map((s) => ({ player_id: s.player_id, sessie_id: s.sessie_id! }));
  return NextResponse.json(await haalReplay(createAdminClient(), teams), { headers: { "Cache-Control": "no-store" } });
}
