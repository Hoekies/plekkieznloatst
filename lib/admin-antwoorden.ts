import type { createAdminClient } from "@/lib/supabase-admin";
import { tekstAfstand, normaliseerAntwoord } from "@/lib/geo";
import { huisLogoUrl } from "@/lib/huisstijl";

type AdminClient = ReturnType<typeof createAdminClient>;

export type AntwoordRij = {
  voortgang_id: string;
  punt_id: string;
  punt_volgorde: number;
  punt_naam: string;
  vraag_type: string;
  vraag_tekst: string;
  antwoord: string | null;      // gekozen optie of open antwoord
  juiste_antwoord: string | null;
  is_correct: boolean | null;
  punten: number;
  max_punten: number;
  // Foto-opdracht
  foto_id: string | null;
  foto_pad: string | null;
  foto_status: "wacht" | "goedgekeurd" | "afgekeurd" | null;
  // Fout of half goed beantwoord: de beheerder kan het alsnog goedkeuren
  kan_goedkeuren: boolean;
  // 🗳️ Stemvraag waarvan de stemming nog open is (nog geen punten)
  stem_open: boolean;
  // Open vraag fout, maar hooguit twee tikfouten van een goed antwoord: waarschijnlijk toch goed
  bijna_goed: boolean;
};

export type TeamAntwoorden = {
  sessie_id: string;
  naam: string;
  icon: string | null;
  status: string;
  score: number;
  started_at: string | null;
  finished_at: string | null;
  rijen: AntwoordRij[];
};

export type AntwoordenData = {
  // huis_logo: eigen logo van de route (huisstijl), voor de uitslag en het rapport
  route: { id: string; name: string; huis_logo?: string | null } | null;
  uitslag_vrijgegeven: boolean;
  teams: TeamAntwoorden[];
  wachtende_fotos: number;
};

// Alle beantwoorde vragen per team van de actieve route, in de volgorde waarin ze gelopen zijn.
// Gebruikt door de pagina "Antwoorden" en het rapport.
export async function haalAntwoorden(admin: AdminClient): Promise<AntwoordenData> {
  const { data: route } = await admin.from("routes").select("*").eq("is_active", true).maybeSingle();
  if (!route) return { route: null, uitslag_vrijgegeven: false, teams: [], wachtende_fotos: 0 };

  type SessieRij = { id: string; status: string; score: number; started_at: string | null; finished_at: string | null; players: { login_name: string; nickname: string | null; icon: string | null } };
  const { data: sessiesRaw } = await admin
    .from("player_sessions")
    .select("id, status, score, started_at, finished_at, players!inner(login_name, nickname, icon)")
    .eq("route_id", route.id)
    .in("status", ["actief", "voltooid"]);
  const sessies = (sessiesRaw ?? []) as unknown as SessieRij[];
  const sessieIds = sessies.map((s) => s.id);

  const { data: punten } = await admin.from("route_points").select("id, name, points, order_index").eq("route_id", route.id);
  const puntIds = (punten ?? []).map((p) => p.id);
  const puntMap = new Map((punten ?? []).map((p) => [p.id, p]));

  const [{ data: vragen }, { data: voortgang }, { data: fotos }] = await Promise.all([
    puntIds.length
      ? admin.from("questions").select("*, answer_options(id, text, is_correct, punten)").in("route_point_id", puntIds)
      : Promise.resolve({ data: [] as never[] }),
    sessieIds.length
      ? admin.from("player_point_progress").select("*").in("session_id", sessieIds).not("answered_at", "is", null).order("answered_at")
      : Promise.resolve({ data: [] as never[] }),
    sessieIds.length
      ? admin.from("foto_inzendingen").select("id, session_id, route_point_id, foto_pad, status").in("session_id", sessieIds)
      : Promise.resolve({ data: [] as never[] }),
  ]);

  type Optie = { id: string; text: string | null; is_correct: boolean; punten: number | null };
  type Vraag = { id: string; route_point_id: string; type: string; question_text: string; points: number; correct_text_answers: string[] | null; numeric_answer: number | null; answer_options: Optie[]; stem_gesloten?: boolean };
  const vraagMap = new Map(((vragen ?? []) as Vraag[]).map((v) => [v.route_point_id, v]));
  const fotoMap = new Map((fotos ?? []).map((f) => [`${f.session_id}:${f.route_point_id}`, f]));

  const teams: TeamAntwoorden[] = sessies.map((s) => {
    const rijen: AntwoordRij[] = [];
    for (const v of (voortgang ?? []).filter((x) => x.session_id === s.id)) {
      const vraag = vraagMap.get(v.route_point_id);
      if (!vraag) continue; // informatiepunten en eindpunt zonder vraag
      const punt = puntMap.get(v.route_point_id);
      // Meerdere goede antwoorden kan: de tekst noemt ze allemaal; de punten van het beste goede antwoord tellen
      const goede = (vraag.answer_options ?? []).filter((o) => o.is_correct);
      const juiste = goede.length > 1
        ? { ...goede[0], text: goede.some((o) => o.text) ? goede.map((o) => o.text ?? "(afbeelding)").join(" / ") : null,
            punten: goede.some((o) => typeof o.punten === "number") ? Math.max(...goede.map((o) => o.punten ?? vraag.points)) : null }
        : goede[0];
      const gekozen = vraag.answer_options?.find((o) => o.id === v.selected_answer_id);
      const foto = fotoMap.get(`${s.id}:${v.route_point_id}`);
      const isStem = vraag.type === "stemvraag";
      const isMeerkeuze = vraag.type === "meerkeuze_tekst" || vraag.type === "meerkeuze_afbeelding" || isStem;
      rijen.push({
        voortgang_id: v.id,
        punt_id: v.route_point_id,
        punt_volgorde: punt?.order_index ?? 0,
        punt_naam: punt?.name ?? "Onbekend punt",
        vraag_type: vraag.type,
        vraag_tekst: vraag.question_text,
        antwoord: isMeerkeuze ? (gekozen?.text ?? (gekozen ? "(afbeelding)" : null)) : v.open_answer_text,
        juiste_antwoord: isStem
          ? "de meerderheid"
          : isMeerkeuze
          ? (juiste?.text ?? (juiste ? "(afbeelding)" : null))
          : vraag.type === "open"
            ? (vraag.numeric_answer != null ? String(vraag.numeric_answer) : (vraag.correct_text_answers ?? []).join(" / ") || null)
            : null,
        is_correct: v.is_correct,
        punten: v.points_awarded,
        max_punten: (isMeerkeuze ? juiste?.punten : null) ?? vraag.points,
        foto_id: foto?.id ?? null,
        foto_pad: foto?.foto_pad ?? null,
        foto_status: (foto?.status as AntwoordRij["foto_status"]) ?? null,
        kan_goedkeuren: !isStem && (isMeerkeuze || vraag.type === "open") && v.is_correct !== true,
        stem_open: isStem && !vraag.stem_gesloten,
        bijna_goed: vraag.type === "open" && v.is_correct !== true && vraag.numeric_answer == null && !!v.open_answer_text
          && (vraag.correct_text_answers ?? []).some((g) => normaliseerAntwoord(g).length >= 4 && tekstAfstand(v.open_answer_text!, g) <= 2),
      });
    }
    return {
      sessie_id: s.id,
      naam: s.players.nickname ?? s.players.login_name,
      icon: s.players.icon,
      status: s.status,
      score: s.score,
      started_at: s.started_at,
      finished_at: s.finished_at,
      rijen,
    };
  }).sort((a, b) => a.naam.localeCompare(b.naam));

  const wachtende_fotos = (fotos ?? []).filter((f) => f.status === "wacht").length;
  return { route: { id: route.id, name: route.name, huis_logo: huisLogoUrl(route) }, uitslag_vrijgegeven: !!route.uitslag_vrijgegeven, teams, wachtende_fotos };
}
