import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.app_metadata?.rol !== "admin") {
    return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });
  }

  const q = request.nextUrl.searchParams.get("q");
  if (!q?.trim()) return NextResponse.json({ fout: "Zoekterm ontbreekt" }, { status: 400 });

  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q.trim())}`,
    { headers: { "User-Agent": "PointRush/1.0 (hoekies.nl)", "Accept-Language": "nl" } }
  );
  const resultaten = await res.json();
  if (!resultaten?.length) return NextResponse.json({ fout: "Plaats niet gevonden" }, { status: 404 });

  return NextResponse.json({ lat: parseFloat(resultaten[0].lat), lng: parseFloat(resultaten[0].lon) });
}
