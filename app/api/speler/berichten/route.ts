import { NextResponse } from "next/server";
import { haalGebruiker } from "@/lib/auth-server";
import { createAdminClient } from "@/lib/supabase-admin";

// Berichten van de organisatie sinds de start van het eigen spel. De spelersapp vraagt dit
// elke paar seconden op (de live-verbinding bleek niet betrouwbaar genoeg).
export async function GET() {
  const user = await haalGebruiker();
  if (!user) return NextResponse.json({ berichten: [] }, { status: 403 });

  const admin = createAdminClient();
  const { data: speler } = await admin.from("players").select("id").eq("auth_user_id", user.id).maybeSingle();
  if (!speler) return NextResponse.json({ berichten: [] });

  const { data: sessie } = await admin
    .from("player_sessions")
    .select("started_at")
    .eq("player_id", speler.id)
    .eq("status", "actief")
    .maybeSingle();
  if (!sessie?.started_at) return NextResponse.json({ berichten: [] });

  // Berichten aan iedereen en aan dit team (migratie 009). Ontbreekt die kolom nog, dan gewoon alles.
  const basis = () => admin.from("broadcasts").select("id, bericht, created_at")
    .gte("created_at", sessie.started_at!).order("created_at", { ascending: true }).limit(20);
  const { data, error } = await basis().or(`player_id.is.null,player_id.eq.${speler.id}`);
  if (error) {
    const { data: alles } = await basis();
    return NextResponse.json({ berichten: alles ?? [] });
  }
  return NextResponse.json({ berichten: data ?? [] });
}
