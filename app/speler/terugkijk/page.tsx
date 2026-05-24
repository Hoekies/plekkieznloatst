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
  // Foto
  foto_pad: string | null;
  foto_status: FotoStatus | null;
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
    : { data: [] };

  const optiesPerVraag = new Map<string, typeof opties>();
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
      foto_pad: foto?.foto_pad ?? null,
      foto_status: (foto?.status as FotoStatus) ?? null,
    };
  });

  return <TerugkijkScherm items={items} />;
}
