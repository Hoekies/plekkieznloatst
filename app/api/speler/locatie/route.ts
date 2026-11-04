import { serverFout } from "@/lib/server-fout";
import { NextRequest, NextResponse } from "next/server";
import { afrondenOpRaster } from "@/lib/geo";
import { haalSpelerSessie } from "@/lib/speler-sessie";

export async function POST(request: NextRequest) {
  const ctx = await haalSpelerSessie();
  if (!ctx) return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });
  const { admin, sessie } = ctx;
  if (!sessie) return NextResponse.json({ fout: "Geen actieve sessie" }, { status: 403 });

  const { latitude, longitude, accuracy, afstandM } = await request.json().catch(() => ({}));
  if (typeof latitude !== "number" || typeof longitude !== "number") {
    return NextResponse.json({ fout: "Ongeldige coördinaten" }, { status: 400 });
  }

  const publiek = afrondenOpRaster(latitude, longitude, 50);

  // 📏 De gelopen afstand komt van de app en levert kilometerbonus op: nooit terug, en niet meer dan hard rennen
  // (12 m/s) sinds de vorige melding, met wat speling voor een GPS-sprong. Wat er te veel is, komt later alsnog mee.
  let afstand: number | null = null;
  if (typeof afstandM === "number" && Number.isFinite(afstandM)) {
    const { data: vorige } = await admin.from("location_updates").select("created_at").eq("session_id", sessie.id)
      .order("created_at", { ascending: false }).limit(1).maybeSingle();
    const sec = vorige ? (Date.now() - Date.parse(vorige.created_at)) / 1000 : 60;
    const oud = (sessie as { afstand_m?: number | null }).afstand_m ?? 0;
    afstand = Math.max(oud, Math.min(afstandM, oud + Math.max(150, sec * 12)));
  }

  const [{ data, error }] = await Promise.all([
    admin
      .from("location_updates")
      .insert({
        session_id: sessie.id,
        latitude,
        longitude,
        accuracy_meters: accuracy ?? 0,
        public_latitude: publiek.lat,
        public_longitude: publiek.lng,
      })
      .select()
      .single(),
    afstand !== null
      ? admin.from("player_sessions").update({ afstand_m: afstand }).eq("id", sessie.id)
      : Promise.resolve(),
  ]);

  if (error) return serverFout(error, "/api/speler/locatie");

  return NextResponse.json(data);
}
