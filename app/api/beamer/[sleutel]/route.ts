import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { haalLiveData } from "@/lib/admin-live";
import { haalGebeurtenissen } from "@/lib/gebeurtenissen";
import { beamerSleutel, beamerSpelers, type BeamerData } from "@/lib/beamer";
import { teamFotos } from "@/lib/teamfoto";

// Gegevens voor het beamerscherm (zonder inloggen): alleen met de juiste sleutel van de actieve route
export async function GET(_: NextRequest, { params }: { params: { sleutel: string } }) {
  const data = await haalLiveData();
  if (!data.route || params.sleutel !== await beamerSleutel(data.route.id)) {
    return NextResponse.json({ fout: "Deze link werkt niet (meer): vraag de spelleider om de nieuwe link" }, { status: 404 });
  }
  const admin = createAdminClient();
  const gebeurtenissen = await haalGebeurtenissen(admin, { zonderHulp: true });
  // 📸 Gefinishte teams met een goedgekeurde groepsfoto: die foto in de stand
  const spelers = beamerSpelers(data.spelers);
  const fotos = await teamFotos(admin, data.route.id, spelers.map((s) => s.sessie_id).filter((id): id is string => !!id));
  const uit: BeamerData = {
    route: { naam: data.route.name, modus: data.route.modus, huis_logo: data.route.huis_logo ?? null },
    route_punten: data.route_punten,
    // Plek zooi is een verborgen val: nooit op het scherm dat de spelers zien
    speciale_items: data.speciale_items.filter((i) => i.type !== "plekzooi"),
    spelers: spelers.map((s) => ({ ...s, foto: s.sessie_id ? fotos.get(s.sessie_id) ?? null : null })),
    gebeurtenissen: gebeurtenissen.slice(0, 12),
  };
  return NextResponse.json(uit, { headers: { "Cache-Control": "no-store" } });
}
