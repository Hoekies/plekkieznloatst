import { NextResponse } from "next/server";
import { haversine } from "@/lib/geo";
import { instappuntenMetKeuze } from "@/lib/instappunten";
import { rondAfAlsTijdVoorbij, eindtijdVoorbij, PAUZE_FOUT } from "@/lib/eindtijd";
import { haalSpeler } from "@/lib/speler-sessie";

export async function GET() {
  const ik = await haalSpeler();
  if (!ik) return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });
  const { admin, spelerId } = ik;
  const { data: sessie } = await admin
    .from("player_sessions")
    .select("*, route:routes(id, name)")
    .eq("player_id", spelerId)
    .eq("status", "actief")
    .maybeSingle();
  if (!sessie) return NextResponse.json(null);

  // Eindtijd van het spel voorbij: alle teams zijn gefinisht, de app gaat naar het finishscherm
  const tijd = await rondAfAlsTijdVoorbij(admin, sessie.route_id);
  if (eindtijdVoorbij(tijd)) return NextResponse.json({ tijd_op: true, eindtijd: tijd.eindtijd });

  // "Wijzigingen naar spelers sturen" (migratie 005): los opvragen, zodat een ontbrekende kolom
  // het spel nooit stopt
  const { data: vernieuw } = await admin.from("routes").select("spelers_vernieuwen_at").eq("id", sessie.route_id).maybeSingle();
  // 📸 Foto's die nog op keuring wachten (de speler ziet dat bij de puntenbalk)
  const { count: fotosWacht } = await admin.from("foto_inzendingen").select("id", { count: "exact", head: true }).eq("session_id", sessie.id).eq("status", "wacht");
  // pauze: het spel is gepauzeerd sinds (de app toont dan een pauzescherm)
  return NextResponse.json({ ...sessie, eindtijd: tijd.eindtijd, pauze: tijd.pauze, vernieuw_at: (vernieuw as { spelers_vernieuwen_at?: string | null } | null)?.spelers_vernieuwen_at ?? null, fotos_wacht: fotosWacht ?? 0 });
}

export async function POST() {
  const ik = await haalSpeler();
  if (!ik) return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });
  const { admin, spelerId } = ik;

  // Actieve route ophalen
  const { data: route } = await admin
    .from("routes")
    .select("*")
    .eq("is_active", true)
    .maybeSingle();

  if (!route) {
    return NextResponse.json({ fout: "Er is momenteel geen actieve route" }, { status: 400 });
  }
  if (eindtijdVoorbij((route as { eindtijd?: string | null }).eindtijd)) {
    return NextResponse.json({ fout: "Het spel is afgelopen: de eindtijd is voorbij" }, { status: 400 });
  }
  if ((route as { gepauzeerd_sinds?: string | null }).gepauzeerd_sinds) {
    return NextResponse.json({ fout: `${PAUZE_FOUT}. Probeer het zo opnieuw.` }, { status: 400 });
  }

  // Controleer bestaande actieve sessie
  const { data: bestaand } = await admin
    .from("player_sessions")
    .select("id")
    .eq("player_id", spelerId)
    .eq("status", "actief")
    .maybeSingle();

  if (bestaand) {
    return NextResponse.json({ fout: "Er is al een actieve sessie" }, { status: 409 });
  }

  // Nieuwe sessie aanmaken
  const { data: sessie, error } = await admin
    .from("player_sessions")
    .insert({
      player_id: spelerId,
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
      const nTeams = Math.max(1, (route.verwacht_aantal_teams as number | undefined) ?? 2);
      const hubStart = punten[0];
      const hubEind = punten[punten.length - 1];
      const middenpunten = punten.slice(1, -1);

      // Instappunt per startplek: zo gekozen dat elk team ongeveer even ver van de startplek begint
      // (zelfde berekening als het voorbeeld in de route-editor); een zelfgekozen instappunt gaat voor
      const offsets = instappuntenMetKeuze(
        { lat: hubStart.latitude, lng: hubStart.longitude },
        middenpunten.map((p) => ({ id: p.id, lat: p.latitude, lng: p.longitude })),
        nTeams,
        route.instappunten as Record<string, string> | null,
      );
      const omgekeerd = (plek: number) => Array.isArray(route.omgekeerde_teams) && route.omgekeerde_teams.includes(plek + 1);

      // Welke startplekken zijn bezet door teams die nu spelen? Afgeleid uit hun eerste twee punten
      // na de start (welk instappunt, en welke kant op). Gestopte en oude spellen tellen niet mee.
      const { data: anderen } = await admin.from("player_sessions").select("id")
        .eq("route_id", route.id).eq("status", "actief").neq("id", sessie.id);
      const bezet: { plek: number; andersom: boolean }[] = [];
      if (anderen?.length && middenpunten.length) {
        const { data: spoAnderen } = await admin.from("session_point_order").select("session_id, volgorde, route_point_id")
          .in("session_id", anderen.map((a) => a.id)).in("volgorde", [2, 3]);
        const perSessie = new Map<string, { eerste?: string; tweede?: string }>();
        for (const r of spoAnderen ?? []) {
          const m = perSessie.get(r.session_id) ?? {};
          if (r.volgorde === 2) m.eerste = r.route_point_id; else m.tweede = r.route_point_id;
          perSessie.set(r.session_id, m);
        }
        const indexVan = new Map(middenpunten.map((p, i) => [p.id, i]));
        for (const { eerste, tweede } of perSessie.values()) {
          const start = eerste ? indexVan.get(eerste) : undefined;
          if (start === undefined) continue;
          const plek = offsets.indexOf(start);
          if (plek < 0) continue;
          const volgende = tweede ? indexVan.get(tweede) : undefined;
          const andersom = volgende !== undefined && middenpunten.length > 1 && volgende === (start - 1 + middenpunten.length) % middenpunten.length;
          bezet.push({ plek, andersom });
        }
      }

      // De eerste vrije startplek. Zijn alle plekken bezet (meer teams dan ingesteld), dan de plek met
      // de minste teams, en dan de andere kant op: zo lopen twee teams nooit het hele spel samen.
      let teamIndex = Array.from({ length: nTeams }, (_, i) => i).find((i) => !bezet.some((b) => b.plek === i));
      let andersom: boolean;
      if (teamIndex !== undefined) {
        andersom = omgekeerd(teamIndex);
      } else {
        const aantalOp = (i: number) => bezet.filter((b) => b.plek === i).length;
        teamIndex = Array.from({ length: nTeams }, (_, i) => i).sort((a, b) => aantalOp(a) - aantalOp(b) || a - b)[0];
        const richtingen = bezet.filter((b) => b.plek === teamIndex);
        const vooruit = richtingen.filter((b) => !b.andersom).length;
        andersom = vooruit > richtingen.length - vooruit;  // de richting die op deze plek het minst gelopen wordt
      }
      const offset = offsets[teamIndex] ?? 0;

      const volgorde = [
        { session_id: sessie.id, volgorde: 1, route_point_id: hubStart.id },
        ...middenpunten.map((_, k) => ({
          session_id: sessie.id,
          volgorde: k + 2,
          route_point_id: middenpunten[((andersom ? offset - k : offset + k) % middenpunten.length + middenpunten.length) % middenpunten.length].id,
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
      // Dit team loopt het rondje andersom (ingesteld per team in de editor)
      const andersom = Array.isArray(route.omgekeerde_teams) && route.omgekeerde_teams.includes(teamIndex + 1);

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
        route_point_id: punten[((andersom ? offset - k : offset + k) % punten.length + punten.length) % punten.length].id,
      }));

      await admin.from("session_point_order").insert(volgorde);
    }
  }

  if (route.modus === "sequentieel") {
    const { data: punten } = await admin
      .from("route_points")
      .select("id, latitude, longitude")
      .eq("route_id", route.id)
      .order("order_index");

    if (punten && punten.length > 0) {
      // Eigen volgorde per team (gewoon de routevolgorde), zodat een banaan punten kan omwisselen
      await admin.from("session_point_order").insert(
        punten.map((p, k) => ({ session_id: sessie.id, volgorde: k + 1, route_point_id: p.id })),
      );

    }
  }

  // Startitems komen na het ingestelde aantal meter lopen, of meteen (zie /api/speler/startitems)

  return NextResponse.json({ ...sessie, modus: route.modus });
}
