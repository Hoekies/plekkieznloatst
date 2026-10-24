import { NextResponse } from "next/server";
import { haalSpelerSessie } from "@/lib/speler-sessie";

// Berichten van de organisatie sinds de start van het eigen spel. De spelersapp vraagt dit
// elke paar seconden op (de live-verbinding bleek niet betrouwbaar genoeg).
export async function GET() {
  const ctx = await haalSpelerSessie();
  if (!ctx) return NextResponse.json({ berichten: [] }, { status: 403 });
  const { admin, spelerId, sessie } = ctx;
  if (!sessie?.started_at) return NextResponse.json({ berichten: [] });

  // Berichten aan iedereen en aan dit team (migratie 009). Ontbreekt die kolom nog, dan gewoon alles.
  const basis = () => admin.from("broadcasts").select("id, bericht, created_at")
    .gte("created_at", sessie.started_at!).order("created_at", { ascending: true }).limit(20);
  const { data, error } = await basis().or(`player_id.is.null,player_id.eq.${spelerId}`);
  if (error) {
    const { data: alles } = await basis();
    return NextResponse.json({ berichten: alles ?? [] });
  }
  return NextResponse.json({ berichten: data ?? [] });
}
