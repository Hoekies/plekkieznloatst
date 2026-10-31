import { haalGebruiker, isAdmin } from "@/lib/auth-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { redirect } from "next/navigation";
import Spiekbriefje, { type SpiekPunt } from "@/components/admin/Spiekbriefje";

// 📄 Spiekbriefje: alle punten met de vraag en het goede antwoord, om mee te nemen op de dag zelf.
// Alleen voor de beheerder; afdrukken of als PDF opslaan via het printvenster van de browser.
export default async function SpiekbriefjePagina({ params }: { params: { id: string } }) {
  const user = await haalGebruiker();
  if (!isAdmin(user)) redirect("/login");

  const admin = createAdminClient();
  const { data: route } = await admin.from("routes").select("*").eq("id", params.id).maybeSingle();
  if (!route) redirect("/admin/routes");

  const { data: punten } = await admin.from("route_points")
    .select("id, name, type, description, latitude, longitude, order_index, questions(type, question_text, points, correct_text_answers, numeric_answer, numeric_tolerance, answer_options(order_index, text, is_correct, answer_type))")
    .eq("route_id", route.id).order("order_index");

  type Rij = {
    id: string; name: string; type: string; description: string | null; latitude: number; longitude: number;
    questions: { type: string; question_text: string; points: number; correct_text_answers: string[] | null; numeric_answer: number | null; numeric_tolerance: number | null;
      answer_options: { order_index: number; text: string | null; is_correct: boolean; answer_type: string }[] }[] | null;
  };
  const rijen = (punten ?? []) as Rij[];
  const verspreid = route.modus === "verspreid" && rijen.length >= 3;

  const lijst: SpiekPunt[] = rijen.map((p, i) => {
    const v = p.questions?.[0] ?? null;
    let antwoord = "";
    if (v) {
      if (v.type === "open") antwoord = v.numeric_answer != null ? `${v.numeric_answer}${v.numeric_tolerance ? ` (± ${v.numeric_tolerance})` : ""}` : (v.correct_text_answers ?? []).join(" / ");
      else if (v.type.startsWith("meerkeuze")) antwoord = [...v.answer_options].sort((a, b) => a.order_index - b.order_index)
        .filter((o) => o.is_correct).map((o) => (o.answer_type === "afbeelding" ? "(afbeelding)" : o.text ?? "")).join(" / ");
      else if (v.type === "foto_opdracht") antwoord = "📸 foto: jij keurt hem goed of af";
      else if (v.type === "stemvraag") antwoord = "🗳️ stemvraag: de meerderheid krijgt de punten";
      else antwoord = (v.correct_text_answers ?? []).join(" / ");
    }
    const laatste = i === rijen.length - 1 && p.type === "eindpunt";
    return {
      label: laatste ? "🏁" : verspreid && i === 0 ? "🏠" : String(verspreid ? i : i + 1),
      naam: p.name, soort: p.type, lat: p.latitude, lng: p.longitude,
      vraag: v?.question_text ?? (p.type === "informatiepunt" ? p.description ?? "" : ""),
      antwoord, punten: v?.points ?? null,
    };
  });

  return <Spiekbriefje routeNaam={route.name} punten={lijst} />;
}
