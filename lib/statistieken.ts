import type { createAdminClient } from "@/lib/supabase-admin";
import { testRol } from "@/lib/test-rol";

type AdminClient = ReturnType<typeof createAdminClient>;

// 📊 Spelstatistieken (spelplezier deel 2): leuke cijfers per team na de uitslag, en de records van het spel.
// Antwoordtijd = van "punt bereikt" tot "antwoord gegeven" (alleen gewone vragen; geen foto, stemvraag of overslaan).

export type TeamStatistiek = {
  goed: number; fout: number; overgeslagen: number;
  snelste: number | null; traagste: number | null; gemiddeld: number | null;   // seconden
  langsteStuk: number | null;                                                  // minuten tussen twee punten
  km: number; itemsIngezet: number; geraakt: number;
};
export type Record_ = { titel: string; emoji: string; team: string; waarde: string };

type Rij = { session_id: string; reached_at: string; answered_at: string | null; is_correct: boolean | null; open_answer_text: string | null; route_points: { questions: { type: string }[] | { type: string } | null } | null };

export async function spelStatistieken(admin: AdminClient, routeId: string, eigenSessie: string): Promise<{ eigen: TeamStatistiek | null; records: Record_[] }> {
  const { data: spellen } = await admin.from("player_sessions").select("id, started_at, afstand_m, players!inner(*)").eq("route_id", routeId).in("status", ["actief", "voltooid"]);
  const eigenTest = !!testRol((spellen ?? []).find((s) => s.id === eigenSessie)?.players);
  // Alleen teams van hetzelfde soort spel (🧪 test en echt apart)
  const teams = (spellen ?? []).filter((s) => !!testRol(s.players) === eigenTest);
  const ids = teams.map((t) => t.id);
  if (!ids.length) return { eigen: null, records: [] };
  const [{ data: voortgang }, { data: log }] = await Promise.all([
    admin.from("player_point_progress").select("session_id, reached_at, answered_at, is_correct, open_answer_text, route_points(questions(type))").in("session_id", ids).order("reached_at"),
    admin.from("item_log").select("gebruiker_session_id, doel_session_id").or(`gebruiker_session_id.in.(${ids.join(",")}),doel_session_id.in.(${ids.join(",")})`),
  ]);
  const naam = (id: string) => {
    const p = teams.find((t) => t.id === id)?.players as unknown as { nickname: string | null; login_name: string } | undefined;
    return p?.nickname ?? p?.login_name ?? "Team";
  };

  const perTeam = new Map<string, TeamStatistiek>();
  for (const t of teams) {
    const rijen = ((voortgang ?? []) as unknown as Rij[]).filter((r) => r.session_id === t.id);
    const tijden: number[] = [];
    let goed = 0, fout = 0, over = 0;
    for (const r of rijen) {
      const q = r.route_points?.questions;
      const type = Array.isArray(q) ? q[0]?.type : q?.type;
      if (!type || !r.answered_at) continue;
      if (r.open_answer_text === "⏭️ overgeslagen") { over++; continue; }
      if (r.is_correct === true) goed++; else if (r.is_correct === false) fout++;
      if (type !== "foto_opdracht" && type !== "stemvraag") {
        const s = Math.round((Date.parse(r.answered_at) - Date.parse(r.reached_at)) / 1000);
        if (s >= 0 && s < 3600) tijden.push(s);
      }
    }
    // Langste stuk lopen: van de start of het vorige punt tot het volgende punt
    const momenten = [t.started_at as string, ...rijen.map((r) => r.reached_at)].map((x) => Date.parse(x)).filter(Number.isFinite).sort((a, b) => a - b);
    let langste: number | null = null;
    for (let i = 1; i < momenten.length; i++) langste = Math.max(langste ?? 0, (momenten[i] - momenten[i - 1]) / 60000);
    perTeam.set(t.id, {
      goed, fout, overgeslagen: over,
      snelste: tijden.length ? Math.min(...tijden) : null,
      traagste: tijden.length ? Math.max(...tijden) : null,
      gemiddeld: tijden.length ? Math.round(tijden.reduce((a, b) => a + b, 0) / tijden.length) : null,
      langsteStuk: langste === null ? null : Math.round(langste),
      km: Math.round(((t.afstand_m as number | null) ?? 0) / 100) / 10,
      itemsIngezet: (log ?? []).filter((l) => l.gebruiker_session_id === t.id).length,
      geraakt: (log ?? []).filter((l) => l.doel_session_id === t.id && l.gebruiker_session_id && l.gebruiker_session_id !== t.id).length,
    });
  }

  // Records: per cijfer het beste team (alleen als er iets te melden is; bij gelijkspel het eerste)
  const records: Record_[] = [];
  const beste = (titel: string, emoji: string, waarde: (s: TeamStatistiek) => number | null, laag: boolean, tekst: (v: number) => string) => {
    let winnaar: [string, number] | null = null;
    for (const [id, s] of perTeam) {
      const v = waarde(s);
      if (v === null || (!laag && v <= 0)) continue;
      if (!winnaar || (laag ? v < winnaar[1] : v > winnaar[1])) winnaar = [id, v];
    }
    if (winnaar) records.push({ titel, emoji, team: naam(winnaar[0]), waarde: tekst(winnaar[1]) });
  };
  beste("Snelste antwoord", "⚡", (s) => s.snelste, true, (v) => `${v} s`);
  beste("Langste nadenker", "🤔", (s) => s.traagste, false, (v) => `${v} s`);
  beste("Verste lopers", "👟", (s) => s.km, false, (v) => `${v.toString().replace(".", ",")} km`);
  beste("Meeste items ingezet", "🎁", (s) => s.itemsIngezet, false, (v) => `${v}×`);
  beste("Vaakst geraakt", "🎯", (s) => s.geraakt, false, (v) => `${v}×`);
  return { eigen: perTeam.get(eigenSessie) ?? null, records };
}
