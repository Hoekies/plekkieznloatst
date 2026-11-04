import { NextRequest, NextResponse } from "next/server";
import { haalSpelerSessie } from "@/lib/speler-sessie";
import { husselLetters } from "@/lib/vraag-soorten";

// Geeft vraag terug ZONDER is_correct op antwoordopties — nooit onthullen aan client vóór beantwoording
export async function GET(_: NextRequest, { params }: { params: { pid: string } }) {
  const ctx = await haalSpelerSessie({ ookVoltooid: true });
  if (!ctx) return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });
  const { admin, sessie } = ctx;
  if (!sessie) return NextResponse.json({ fout: "Geen spel" }, { status: 403 });
  const { data: punt } = await admin.from("route_points").select("id").eq("id", params.pid).eq("route_id", sessie.route_id).maybeSingle();
  if (!punt) return NextResponse.json({ fout: "Onbekend punt" }, { status: 404 });

  // Alleen een punt dat het team al bereikt heeft, of een van de volgende drie: die haalt de app alvast op voor als
  // er straks geen bereik is (lib/vraag-cache.ts). Zo is niet de hele route vooraf te lezen.
  const [{ data: voortgang }, { data: eigenVolgorde }, { data: routeVolgorde }] = await Promise.all([
    admin.from("player_point_progress").select("route_point_id, answered_at").eq("session_id", sessie.id),
    admin.from("session_point_order").select("route_point_id").eq("session_id", sessie.id).order("volgorde"),
    admin.from("route_points").select("id").eq("route_id", sessie.route_id).order("order_index"),
  ]);
  const bereikt = (voortgang ?? []).some((v) => v.route_point_id === params.pid);
  if (!bereikt) {
    const klaar = new Set((voortgang ?? []).filter((v) => v.answered_at).map((v) => v.route_point_id));
    const volgorde = eigenVolgorde?.length ? eigenVolgorde.map((v) => v.route_point_id) : (routeVolgorde ?? []).map((v) => v.id);
    if (!volgorde.filter((id) => !klaar.has(id)).slice(0, 3).includes(params.pid)) {
      return NextResponse.json({ fout: "Deze vraag is nog niet aan de beurt" }, { status: 403 });
    }
  }

  const { data: vraag } = await admin
    .from("questions")
    .select(`
      id, route_point_id, type, question_text, question_image_path, points,
      answer_options(id, color, answer_type, text, image_path, order_index)
    `)
    .eq("route_point_id", params.pid)
    .order("order_index", { referencedTable: "answer_options" })
    .maybeSingle();

  if (!vraag) return NextResponse.json(null);
  // Per vraag: husselen, geluid en tijdslimiet (migratie 014). Los opgehaald: zonder die migratie werkt de vraag gewoon
  const { data: extra } = await admin.from("questions").select("antwoorden_husselen, geluid_pad, tijdslimiet_seconden").eq("id", vraag.id).maybeSingle();
  // 🔤 Anagram: alleen de letters door elkaar, nooit het woord
  if (vraag.type === "anagram") {
    const { data: w } = await admin.from("questions").select("correct_text_answers").eq("id", vraag.id).maybeSingle();
    return NextResponse.json({ ...vraag, ...(extra ?? {}), letters: husselLetters(w?.correct_text_answers?.[0] ?? "") });
  }
  // 🔀 Volgorde: de items door elkaar en zonder hun plek (anders verraadt order_index het antwoord)
  if (vraag.type === "volgorde") {
    const opties = [...(vraag.answer_options ?? [])].sort(() => Math.random() - 0.5).map((o, i) => ({ ...o, order_index: i + 1 }));
    return NextResponse.json({ ...vraag, ...(extra ?? {}), antwoorden_husselen: false, answer_options: opties });
  }
  return NextResponse.json({ ...vraag, ...(extra ?? {}) });
}
