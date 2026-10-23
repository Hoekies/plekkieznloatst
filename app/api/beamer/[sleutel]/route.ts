import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { haalLiveData } from "@/lib/admin-live";
import { haalGebeurtenissen } from "@/lib/gebeurtenissen";
import { beamerSleutel, beamerSpelers, type BeamerData } from "@/lib/beamer";

// Gegevens voor het beamerscherm (zonder inloggen): alleen met de juiste sleutel van de actieve route
export async function GET(_: NextRequest, { params }: { params: { sleutel: string } }) {
  const data = await haalLiveData();
  if (!data.route || params.sleutel !== await beamerSleutel(data.route.id)) {
    return NextResponse.json({ fout: "Deze link werkt niet (meer): vraag de spelleider om de nieuwe link" }, { status: 404 });
  }
  const gebeurtenissen = await haalGebeurtenissen(createAdminClient(), { zonderHulp: true });
  const uit: BeamerData = {
    route: { naam: data.route.name, modus: data.route.modus, huis_logo: data.route.huis_logo ?? null },
    route_punten: data.route_punten,
    speciale_items: data.speciale_items,
    spelers: beamerSpelers(data.spelers),
    gebeurtenissen: gebeurtenissen.slice(0, 12),
  };
  return NextResponse.json(uit, { headers: { "Cache-Control": "no-store" } });
}
