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

  // Voor verspreid-modus: vul session_point_order met hub-start, geroteerde middenpunten, hub-eind
  if (route.modus === "verspreid") {
    const { data: punten } = await admin
      .from("route_points")
      .select("id, latitude, longitude")
      .eq("route_id", route.id)
      .order("order_index");

    if (punten && punten.length >= 3) {
      const { count: aantalSessies } = await admin
        .from("player_sessions")
        .select("*", { count: "exact", head: true })
        .eq("route_id", route.id)
        .neq("id", sessie.id);

      const nTeams = (route.verwacht_aantal_teams as number | undefined) ?? 2;
      const teamIndex = (aantalSessies ?? 0) % nTeams;

      const hubStart = punten[0];
      const hubEind = punten[punten.length - 1];
      const middenpunten = punten.slice(1, -1);

      // Bereken cumulatieve afstand over middenpunten
      const cumulatief = [0];
      for (let i = 1; i < middenpunten.length; i++) {
        cumulatief.push(
          cumulatief[i - 1] +
          haversine(middenpunten[i - 1].latitude, middenpunten[i - 1].longitude,
                    middenpunten[i].latitude,     middenpunten[i].longitude)
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
        { session_id: sessie.id, volgorde: 1, route_point_id: hubStart.id },
        ...middenpunten.map((_, k) => ({
          session_id: sessie.id,
          volgorde: k + 2,
          route_point_id: middenpunten[(offset + k) % middenpunten.length].id,
        })),
        { session_id: sessie.id, volgorde: middenpunten.length + 2, route_point_id: hubEind.id },
      ];

      await admin.from("session_point_order").insert(volgorde);
    } else if (punten && punten.length > 0) {
      // Fallback voor routes zonder hub (< 3 punten)
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

  return NextResponse.json(sessie);
}
