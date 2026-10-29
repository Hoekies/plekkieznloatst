import type { createAdminClient } from "@/lib/supabase-admin";

// Tijdlijn van het lopende spel, nieuwste eerst: voor het dashboard en het beamerscherm.
// Wordt samengesteld uit wat al wordt opgeslagen (sessies, voortgang, foto's, itemlogboek, hulp).

type Gebeurtenis = {
  id: string;
  tijd: string;
  speler_id: string | null;   // wie het deed (voor de kleur in de tijdlijn)
  icoon: string;              // emoji, of leeg als er een item-afbeelding bij hoort
  item: string | null;        // itemtype: toont /items/<type>.webp
  tekst: string;
};

const ITEM_NAAM: Record<string, string> = {
  ster: "een ster", verdubbeling: "een verdubbeling", radar: "de radar", bom: "een bom", spook: "een spook",
  dief: "de dief", banaan: "een banaan", wissel: "een wissel", vraagteken: "een vraagteken", plekzooi: "plek zooi", schaduw: "de schaduw",
};

const MAX = 40;

type AdminClient = ReturnType<typeof createAdminClient>;

// zonderHulp: hulpvragen niet tonen (beamerscherm: die zijn voor de organisatie)
export async function haalGebeurtenissen(admin: AdminClient, { zonderHulp = false }: { zonderHulp?: boolean } = {}): Promise<Gebeurtenis[]> {
  const { data: route } = await admin.from("routes").select("id").eq("is_active", true).maybeSingle();
  if (!route) return [];

  type SessieRij = { id: string; player_id: string; status: string; score: number; started_at: string | null; finished_at: string | null; players: { login_name: string; nickname: string | null } };
  const { data: sessiesRaw } = await admin
    .from("player_sessions")
    .select("id, player_id, status, score, started_at, finished_at, players!inner(login_name, nickname)")
    .eq("route_id", route.id)
    .in("status", ["actief", "voltooid"]);
  const sessies = (sessiesRaw ?? []) as unknown as SessieRij[];
  if (!sessies.length) return [];

  const sessieIds = sessies.map((s) => s.id);
  const lijst = sessieIds.join(",");
  const naam = new Map(sessies.map((s) => [s.id, s.players.nickname ?? s.players.login_name]));
  const speler = new Map(sessies.map((s) => [s.id, s.player_id]));

  const [{ data: voortgang }, { data: fotos }, { data: logboek }, { data: hulp }, { data: correcties }] = await Promise.all([
    admin.from("player_point_progress")
      .select("id, session_id, reached_at, answered_at, is_correct, points_awarded, route_points(name)")
      .in("session_id", sessieIds).order("reached_at", { ascending: false }).limit(MAX),
    admin.from("foto_inzendingen")
      .select("id, session_id, created_at, status, route_points(name)")
      .in("session_id", sessieIds).order("created_at", { ascending: false }).limit(MAX),
    admin.from("item_log")
      .select("id, gebruiker_session_id, doel_session_id, item_type, omschrijving, created_at")
      .or(`gebruiker_session_id.in.(${lijst}),doel_session_id.in.(${lijst})`)
      .order("created_at", { ascending: false }).limit(MAX),
    admin.from("hulpverzoeken")
      .select("id, session_id, created_at, route_points(name)")
      .in("session_id", sessieIds).order("created_at", { ascending: false }).limit(10),
    // Handmatige bonus/aftrek (migratie 006; zonder die tabel komt er gewoon niets terug)
    admin.from("score_correcties")
      .select("id, session_id, delta, reden, created_at")
      .in("session_id", sessieIds).order("created_at", { ascending: false }).limit(MAX),
  ]);

  const puntNaam = (rp: unknown) => {
    const p = rp as { name?: string } | { name?: string }[] | null;
    return (Array.isArray(p) ? p[0]?.name : p?.name) ?? "een punt";
  };

  const uit: Gebeurtenis[] = [];

  for (const s of sessies) {
    if (s.started_at) uit.push({ id: `start-${s.id}`, tijd: s.started_at, speler_id: s.player_id, icoon: "🚀", item: null, tekst: `${naam.get(s.id)} is gestart` });
    if (s.finished_at) uit.push({ id: `finish-${s.id}`, tijd: s.finished_at, speler_id: s.player_id, icoon: "🏁", item: null, tekst: `${naam.get(s.id)} is gefinisht met ${s.score} pt` });
  }

  type VoortgangRij = { id: string; session_id: string; reached_at: string; answered_at: string | null; is_correct: boolean | null; points_awarded: number | null; route_points: unknown };
  for (const v of (voortgang ?? []) as VoortgangRij[]) {
    const wie = naam.get(v.session_id) ?? "Een speler";
    const punt = puntNaam(v.route_points);
    if (v.answered_at && v.is_correct !== null) {
      uit.push({
        id: `vraag-${v.id}`, tijd: v.answered_at, speler_id: speler.get(v.session_id) ?? null,
        icoon: v.is_correct ? "✅" : "❌", item: null,
        tekst: v.is_correct ? `${wie} had de vraag bij ${punt} goed (+${v.points_awarded ?? 0})` : `${wie} had de vraag bij ${punt} fout`,
      });
    } else {
      uit.push({ id: `punt-${v.id}`, tijd: v.reached_at, speler_id: speler.get(v.session_id) ?? null, icoon: "📍", item: null, tekst: `${wie} bereikte ${punt}` });
    }
  }

  type FotoRij = { id: string; session_id: string; created_at: string; route_points: unknown };
  for (const f of (fotos ?? []) as FotoRij[]) {
    uit.push({ id: `foto-${f.id}`, tijd: f.created_at, speler_id: speler.get(f.session_id) ?? null, icoon: "📸", item: null, tekst: `${naam.get(f.session_id) ?? "Een speler"} stuurde een foto in bij ${puntNaam(f.route_points)}` });
  }

  type LogRij = { id: string; gebruiker_session_id: string | null; doel_session_id: string | null; item_type: string; omschrijving?: string | null; created_at: string };
  for (const l of (logboek ?? []) as LogRij[]) {
    const item = ITEM_NAAM[l.item_type] ?? l.item_type;
    const van = l.gebruiker_session_id ? naam.get(l.gebruiker_session_id) : null;
    const op = l.doel_session_id ? naam.get(l.doel_session_id) : null;
    // 🪤 Val en 📦 schat (migratie 007) hebben een eigen zin
    const tekst = l.omschrijving?.startsWith("val:") && van && op ? `🪤 ${op} liep in de val van ${van}`
      : l.omschrijving === "schat" ? `📦 ${van ?? "Een team"} pakte de vliegende schat`
      : !van && op ? `${op} liep in ${item}`
      : van && op ? `${van} zette ${item} in op ${op}`
      : `${van ?? "Een speler"} zette ${item} in`;
    uit.push({ id: `item-${l.id}`, tijd: l.created_at, speler_id: speler.get(l.gebruiker_session_id ?? l.doel_session_id ?? "") ?? null, icoon: "", item: l.item_type, tekst });
  }

  type HulpRij = { id: string; session_id: string; created_at: string; route_points: unknown };
  for (const h of (zonderHulp ? [] : hulp ?? []) as HulpRij[]) {
    uit.push({ id: `hulp-${h.id}`, tijd: h.created_at, speler_id: speler.get(h.session_id) ?? null, icoon: "⚠️", item: null, tekst: `${naam.get(h.session_id) ?? "Een speler"} kan ${puntNaam(h.route_points)} niet bereiken` });
  }

  type CorrectieRij = { id: string; session_id: string; delta: number; reden: string | null; created_at: string };
  for (const c of (correcties ?? []) as CorrectieRij[]) {
    const wie = naam.get(c.session_id) ?? "Een speler";
    const punten = c.delta > 0 ? `+${c.delta}` : String(c.delta);
    uit.push({ id: `correctie-${c.id}`, tijd: c.created_at, speler_id: speler.get(c.session_id) ?? null, icoon: c.delta > 0 ? "🎁" : "➖", item: null, tekst: `${wie} kreeg ${punten} pt van de spelleider${c.reden ? ` (${c.reden})` : ""}` });
  }

  uit.sort((a, b) => new Date(b.tijd).getTime() - new Date(a.tijd).getTime());
  return uit.slice(0, MAX);
}
