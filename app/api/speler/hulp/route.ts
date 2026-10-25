import { NextResponse } from "next/server";
import { stuurPushNaarBeheer } from "@/lib/push";
import { bepaalVolgendPunt } from "@/lib/volgend-punt";
import { haalSpelerSessie } from "@/lib/speler-sessie";

// Status van de laatste melding van dit team
export async function GET() {
  const ctx = await haalSpelerSessie();
  if (!ctx?.sessie) return NextResponse.json({ fout: "Geen actieve sessie" }, { status: 403 });
  const admin = ctx.admin, sessie = ctx.sessie;
  const { data: laatste } = await admin
    .from("hulpverzoeken")
    .select("id, status, afgehandeld_at")
    .eq("session_id", sessie.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return NextResponse.json({
    id: laatste?.id ?? null,
    status: laatste?.status ?? null,
    afgehandeld_at: laatste?.afgehandeld_at ?? null,
  });
}

// Meld dat het volgende punt niet te bereiken is
export async function POST() {
  const ctx = await haalSpelerSessie();
  if (!ctx?.sessie) return NextResponse.json({ fout: "Geen actieve sessie" }, { status: 403 });
  const admin = ctx.admin, sessie = ctx.sessie;

  const { data: open } = await admin
    .from("hulpverzoeken")
    .select("id")
    .eq("session_id", sessie.id)
    .eq("status", "open")
    .maybeSingle();
  if (open) return NextResponse.json({ id: open.id, status: "open" });

  const punt = await bepaalVolgendPunt(admin, sessie);
  if (!punt) return NextResponse.json({ fout: "Er is geen volgend punt om te melden" }, { status: 400 });

  const { data, error } = await admin
    .from("hulpverzoeken")
    .insert({ session_id: sessie.id, route_point_id: punt.id })
    .select("id, status")
    .single();
  if (error) return NextResponse.json({ fout: error.message }, { status: 500 });

  // Pushmelding naar de beheerder: dit team kan niet verder
  const { data: team } = await admin.from("players").select("nickname, login_name").eq("id", sessie.player_id).maybeSingle();
  await stuurPushNaarBeheer({
    titel: `⚠️ ${team?.nickname ?? team?.login_name ?? "Een team"} kan een punt niet bereiken`,
    tekst: `"${punt.name}" is niet te bereiken. Tik om het punt vrij te geven.`,
    // Tik op de melding: het dashboard opent meteen met het venster van dit team (vrijgeven, bellen)
    url: `/admin?team=${sessie.player_id}`,
    tag: `hulp-${sessie.id}`,
  });

  return NextResponse.json(data);
}
