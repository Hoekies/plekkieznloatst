import { createServerSupabaseClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { redirect } from "next/navigation";
import TerugkijkScherm from "@/components/speler/TerugkijkScherm";
import type { VraagType, FotoStatus } from "@/types/database";

export type TerugkijkItem = {
  punt_id: string;
  punt_naam: string;
  vraag_type: VraagType | null;
  vraag_tekst: string | null;
  vraag_afbeelding: string | null;
  max_punten: number;
  punten_behaald: number;
  is_correct: boolean | null;
  // Meerkeuze
  gekozen_antwoord_tekst: string | null;
  gekozen_antwoord_afbeelding: string | null;
  juiste_antwoord_tekst: string | null;
  juiste_antwoord_afbeelding: string | null;
  // Open
  open_antwoord: string | null;
  // Foto (tijdelijke link: de opslag is afgeschermd)
  foto_pad: string | null;
  foto_status: FotoStatus | null;
  tijd: string;
};

// Een ingezet of ontvangen item, tussen de punten door in tijdsvolgorde
export type TerugkijkGebeurtenis = {
  soort: "ingezet" | "ontvangen";
  item_type: string;
  ander_team: string | null;   // op wie (ingezet) of van wie (ontvangen); null = geen ander team
  omschrijving: string | null;
  tijd: string;
};

export default async function TerugkijkPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();

  const { data: speler } = await admin
    .from("players")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (!speler) redirect("/login");

  const { data: sessie } = await admin
    .from("player_sessions")
    .select("id, route_id")
    .eq("player_id", speler.id)
    .eq("status", "voltooid")
    .not("finished_at", "is", null)
    .order("finished_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!sessie) redirect("/speler/finish");

  // Alle voortgang voor deze sessie
  const { data: voortgang } = await admin
    .from("player_point_progress")
    .select("route_point_id, reached_at, answered_at, selected_answer_id, open_answer_text, is_correct, points_awarded")
    .eq("session_id", sessie.id)
    .order("reached_at", { ascending: true });

  const puntIds = (voortgang ?? []).map((v) => v.route_point_id);
  if (!puntIds.length) redirect("/speler/finish");

  // Routepunten
  const { data: punten } = await admin
    .from("route_points")
    .select("id, name, points")
    .in("id", puntIds);

  const puntMap = new Map((punten ?? []).map((p) => [p.id, p]));

  // Vragen
  const { data: vragen } = await admin
    .from("questions")
    .select("id, route_point_id, type, question_text, question_image_path, points")
    .in("route_point_id", puntIds);

  const vraagMap = new Map((vragen ?? []).map((v) => [v.route_point_id, v]));
  const vraagIds = (vragen ?? []).map((v) => v.id);

  // Antwoordopties (inclusief is_correct — dit is de terugkijk, speler mag nu alles zien)
  const { data: opties } = vraagIds.length
    ? await admin
        .from("answer_options")
        .select("id, question_id, answer_type, text, image_path, is_correct")
        .in("question_id", vraagIds)
    : { data: null };

  type AntwoordOptie = NonNullable<typeof opties>[number];
  const optiesPerVraag = new Map<string, AntwoordOptie[]>();
  (opties ?? []).forEach((o) => {
    if (!optiesPerVraag.has(o.question_id)) optiesPerVraag.set(o.question_id, []);
    optiesPerVraag.get(o.question_id)!.push(o);
  });

  // Foto-inzendingen
  const { data: fotos } = await admin
    .from("foto_inzendingen")
    .select("route_point_id, foto_pad, status")
    .eq("session_id", sessie.id);

  const fotoMap = new Map((fotos ?? []).map((f) => [f.route_point_id, f]));

  // Eigen foto's via een tijdelijke link tonen (de opslag is niet openbaar)
  const fotoUrls = new Map<string, string>();
  for (const f of fotos ?? []) {
    const { data: getekend } = await admin.storage.from("foto-inzendingen").createSignedUrl(f.foto_pad, 60 * 60);
    if (getekend?.signedUrl) fotoUrls.set(f.route_point_id, getekend.signedUrl);
  }

  // Items: wat dit team inzette en wat het van anderen kreeg
  const { data: logRijen } = await admin
    .from("item_log")
    .select("gebruiker_session_id, doel_session_id, item_type, omschrijving, created_at")
    .or(`gebruiker_session_id.eq.${sessie.id},doel_session_id.eq.${sessie.id}`)
    .order("created_at");
  const andereIds = [...new Set((logRijen ?? []).flatMap((r) => [r.gebruiker_session_id, r.doel_session_id])
    .filter((id): id is string => !!id && id !== sessie.id))];
  const teamNamen = new Map<string, string>();
  if (andereIds.length) {
    const { data: anderen } = await admin.from("player_sessions").select("id, players!inner(login_name, nickname)").in("id", andereIds);
    for (const a of (anderen ?? []) as unknown as { id: string; players: { login_name: string; nickname: string | null } }[]) {
      teamNamen.set(a.id, a.players.nickname ?? a.players.login_name);
    }
  }
  const gebeurtenissen: TerugkijkGebeurtenis[] = (logRijen ?? []).map((r) => {
    const ingezet = r.gebruiker_session_id === sessie.id;
    const ander = ingezet ? r.doel_session_id : r.gebruiker_session_id;
    return {
      soort: ingezet ? "ingezet" : "ontvangen",
      item_type: r.item_type,
      ander_team: ander ? (teamNamen.get(ander) ?? "een ander team") : null,
      omschrijving: r.omschrijving,
      tijd: r.created_at,
    };
  });

  // Samenstellen
  const items: TerugkijkItem[] = (voortgang ?? []).map((v) => {
    const punt = puntMap.get(v.route_point_id);
    const vraag = vraagMap.get(v.route_point_id);
    const foto = fotoMap.get(v.route_point_id);

    let gekozenTekst: string | null = null;
    let gekozenAfbeelding: string | null = null;
    let juisteTekst: string | null = null;
    let juisteAfbeelding: string | null = null;

    if (vraag && v.selected_answer_id) {
      const vraagOpties = optiesPerVraag.get(vraag.id) ?? [];
      const gekozen = vraagOpties.find((o) => o.id === v.selected_answer_id);
      const juiste = vraagOpties.find((o) => o.is_correct);
      gekozenTekst = gekozen?.text ?? null;
      gekozenAfbeelding = gekozen?.image_path ?? null;
      juisteTekst = juiste?.text ?? null;
      juisteAfbeelding = juiste?.image_path ?? null;
    } else if (vraag && vraag.type === "open" && v.is_correct === false) {
      // Toon het eerste geaccepteerde antwoord als hint
      juisteTekst = null; // zit in vraag.correct_text_answers maar die fetchen we hier niet
    }

    return {
      punt_id: v.route_point_id,
      punt_naam: punt?.name ?? "Onbekend punt",
      vraag_type: (vraag?.type as VraagType) ?? null,
      vraag_tekst: vraag?.question_text ?? null,
      vraag_afbeelding: vraag?.question_image_path ?? null,
      max_punten: vraag?.points ?? punt?.points ?? 0,
      punten_behaald: v.points_awarded,
      is_correct: v.is_correct,
      gekozen_antwoord_tekst: gekozenTekst,
      gekozen_antwoord_afbeelding: gekozenAfbeelding,
      juiste_antwoord_tekst: juisteTekst,
      juiste_antwoord_afbeelding: juisteAfbeelding,
      open_antwoord: v.open_answer_text,
      foto_pad: fotoUrls.get(v.route_point_id) ?? null,
      foto_status: (foto?.status as FotoStatus) ?? null,
      tijd: v.answered_at ?? v.reached_at,
    };
  });

  return <TerugkijkScherm items={items} gebeurtenissen={gebeurtenissen} />;
}
