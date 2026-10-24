import { NextRequest, NextResponse } from "next/server";
import { afrondenOpRaster } from "@/lib/geo";
import { haalSpelerSessie } from "@/lib/speler-sessie";

export async function POST(request: NextRequest) {
  const ctx = await haalSpelerSessie();
  if (!ctx) return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });
  const { admin, sessie } = ctx;
  if (!sessie) return NextResponse.json({ fout: "Geen actieve sessie" }, { status: 403 });

  const { latitude, longitude, accuracy, afstandM } = await request.json();
  if (typeof latitude !== "number" || typeof longitude !== "number") {
    return NextResponse.json({ fout: "Ongeldige coördinaten" }, { status: 400 });
  }

  const publiek = afrondenOpRaster(latitude, longitude, 50);

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
    typeof afstandM === "number"
      ? admin.from("player_sessions").update({ afstand_m: afstandM }).eq("id", sessie.id)
      : Promise.resolve(),
  ]);

  if (error) return NextResponse.json({ fout: error.message }, { status: 500 });

  return NextResponse.json(data);
}
