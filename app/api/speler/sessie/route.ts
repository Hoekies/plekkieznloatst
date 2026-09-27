import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { haversine } from "@/lib/geo";

async function getSpeler() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const admin = createAdminClient();
  const { data: speler } = await admin
    .from("players")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  return speler ?? null;
}

export async function GET() {
  const speler = await getSpeler();
  if (!speler) return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });

  const admin = createAdminClient();
  const { data: sessie } = await admin
    .from("player_sessions")
    .select("*, route:routes(id, name)")
    .eq("player_id", speler.id)
    .eq("status", "actief")
    .maybeSingle();

  return NextResponse.json(sessie ?? null);
}

export async function POST() {
  const speler = await getSpeler();
  if (!speler) return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });

  const admin = createAdminClient();

  // Actieve route ophalen
  const { data: route } = await admin
    .from("routes")
    .select("id, modus, verwacht_aantal_teams")
    .eq("is_active", true)
    .maybeSingle();

  if (!route) {
    return NextResponse.json({ fout: "Er is momenteel geen actieve route" }, { status: 400 });
  }

  // Controleer bestaande actieve sessie
  const { data: bestaand } = await admin
    .from("player_sessions")
    .select("id")
    .eq("player_id", speler.id)
    .eq("status", "actief")
    .maybeSingle();

  if (bestaand) {
    return NextResponse.json({ fout: "Er is al een actieve sessie" }, { status: 409 });
  }

  // Nieuwe sessie aanmaken
  const { data: sessie, error } = await admin
    .from("player_sessions")
    .insert({
      player_id: speler.id,
      route_id: route.id,
      started_at: new Date().toISOString(),
      status: "actief",
      score: 0,
    })
    .select()
    .single();

  if (error || !sessie) {
    return NextResponse.json({ fout: error?.message ?? "Sessie aanmaken mislukt" }, { status: 500 });
  }

  // Voor verspreid-modus: vul session_point_order met geroteerde lusspunten (eigen
  // startpunt per team, geen verplichte gezamenlijke hub-start) + een vast gekozen eindpunt
  if (route.modus === "verspreid") {
    const { data: punten } = await admin
      .from("route_points")
      .select("id, latitude, longitude")
      .eq("route_id", route.id)
      .order("order_index");

    if (punten && punten.length >= 2) {
      const { count: aantalSessies } = await admin
        .from("player_sessions")
        .select("*", { count: "exact", head: true })
        .eq("route_id", route.id)
        .neq("id", sessie.id);

      const nTeams = (route.verwacht_aantal_teams as number | undefined) ?? 2;
      const teamIndex = (aantalSessies ?? 0) % nTeams;

      const gekozenEindpunt = punten[punten.length - 1];
      const lusPunten = punten.slice(0, -1);

      // Bereken cumulatieve afstand over de lus, zodat elk team op eigen GPS-afstand start
      const cumulatief = [0];
      for (let i = 1; i < lusPunten.length; i++) {
        cumulatief.push(
          cumulatief[i - 1] +
          haversine(lusPunten[i - 1].latitude, lusPunten[i - 1].longitude,
                    lusPunten[i].latitude,     lusPunten[i].longitude)
        );
      }
      const totalMeters = cumulatief[cumulatief.length - 1];
      const targetMeters = totalMeters > 0 ? (totalMeters / nTeams) * teamIndex : 0;

      let offset = 0;
      let minDelta = Infinity;
      for (let i = 0; i < cumulatief.length; i++) {
        const delta = Math.abs(cumulatief[i] - targetMeters);
        if (delta < minDelta) { minDelta = delta; offset = i; }
      }

      const volgorde = [
        ...lusPunten.map((_, k) => ({
          session_id: sessie.id,
          volgorde: k + 1,
          route_point_id: lusPunten[(offset + k) % lusPunten.length].id,
        })),
        { session_id: sessie.id, volgorde: lusPunten.length + 1, route_point_id: gekozenEindpunt.id },
      ];

      await admin.from("session_point_order").insert(volgorde);
    } else if (punten && punten.length > 0) {
      // Fallback voor routes met maar 1 punt (geen apart eindpunt mogelijk)
      const { count: aantalSessies } = await admin
        .from("player_sessions")
        .select("*", { count: "exact", head: true })
        .eq("route_id", route.id)
        .neq("id", sessie.id);

      const nTeams = (route.verwacht_aantal_teams as number | undefined) ?? 2;
      const teamIndex = (aantalSessies ?? 0) % nTeams;

      const cumulatief = [0];
      for (let i = 1; i < punten.length; i++) {
        cumulatief.push(
          cumulatief[i - 1] +
          haversine(punten[i - 1].latitude, punten[i - 1].longitude,
                    punten[i].latitude,     punten[i].longitude)
        );
      }
      const totalMeters = cumulatief[cumulatief.length - 1];
      const targetMeters = totalMeters > 0 ? (totalMeters / nTeams) * teamIndex : 0;

      let offset = 0;
      let minDelta = Infinity;
      for (let i = 0; i < cumulatief.length; i++) {
        const delta = Math.abs(cumulatief[i] - targetMeters);
        if (delta < minDelta) { minDelta = delta; offset = i; }
      }

      const volgorde = punten.map((p, k) => ({
        session_id: sessie.id,
        volgorde: k + 1,
        route_point_id: punten[(offset + k) % punten.length].id,
      }));

      await admin.from("session_point_order").insert(volgorde);
    }
  }

  return NextResponse.json({ ...sessie, modus: route.modus });
}
