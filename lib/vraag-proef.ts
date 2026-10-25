import type { VraagData, Feedback } from "@/components/speler/VraagPopup";
import { normaliserenNumeriek, tekstKlopt } from "@/lib/geo";

// 🧪 Een antwoord beoordelen zoals de server dat doet, maar in de browser (proef in de editor en via de QR-code):
// er wordt niets opgeslagen. Hiervoor moet de vraag mét de goede antwoorden geladen zijn (alleen voor de beheerder,
// of met de geheime QR-code).
export type AdminVraag = Omit<VraagData, "answer_options"> & { correct_text_answers: string[] | null; numeric_answer: number | null; numeric_tolerance: number | null;
  answer_options: (VraagData["answer_options"][number] & { is_correct: boolean; punten: number | null; uitleg?: string | null })[] };

// Antwoord beoordelen zoals de server dat doet (zelfde regels), maar hier in de browser: er wordt niets opgeslagen
export function beoordeel(v: VraagData, antwoordId: string | null, openTekst?: string, teLaat?: boolean): Feedback {
  const a = v as unknown as AdminVraag;
  const juiste = a.answer_options?.find((o) => o.is_correct) ?? null;
  const basis = { correct_answer_id: juiste?.id ?? null, correct_answer_ids: (a.answer_options ?? []).filter((o) => o.is_correct).map((o) => o.id),
    uitleg: Object.fromEntries((a.answer_options ?? []).filter((o) => o.uitleg && (o.is_correct || o.id === antwoordId)).map((o) => [o.id, o.uitleg as string])),
    correct_text_answers: null, numeric_answer: null, numeric_tolerance: null };
  if (a.type === "stemvraag") return { ...basis, correct_answer_id: null, is_correct: null, stem: true, points_awarded: 0 };
  if (teLaat) return { ...basis, is_correct: false, points_awarded: 0 };
  if (a.type === "open") {
    if (a.numeric_answer != null) {
      const getal = normaliserenNumeriek(openTekst ?? "");
      const goed = getal !== null && Math.abs(getal - a.numeric_answer) <= (a.numeric_tolerance ?? 0);
      return { ...basis, is_correct: goed, points_awarded: goed ? a.points : 0, numeric_answer: a.numeric_answer, numeric_tolerance: a.numeric_tolerance ?? 0 };
    }
    const goed = (a.correct_text_answers ?? []).some((g) => tekstKlopt(openTekst ?? "", g));
    return { ...basis, is_correct: goed, points_awarded: goed ? a.points : 0, correct_text_answers: a.correct_text_answers ?? [] };
  }
  const gekozen = a.answer_options?.find((o) => o.id === antwoordId);
  const goed = !!gekozen?.is_correct;
  return { ...basis, is_correct: goed, points_awarded: typeof gekozen?.punten === "number" ? gekozen.punten : goed ? a.points : 0 };
}

