import { NextRequest, NextResponse } from "next/server";
import { haalSpelerSessie } from "@/lib/speler-sessie";

// Geeft vraag terug ZONDER is_correct op antwoordopties — nooit onthullen aan client vóór beantwoording
export async function GET(_: NextRequest, { params }: { params: { pid: string } }) {
  const ctx = await haalSpelerSessie({ ookVoltooid: true });
  if (!ctx) return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });
  const { admin, sessie } = ctx;
  if (!sessie) return NextResponse.json({ fout: "Geen spel" }, { status: 403 });
  const { data: punt } = await admin.from("route_points").select("id").eq("id", params.pid).eq("route_id", sessie.route_id).maybeSingle();
  if (!punt) return NextResponse.json({ fout: "Onbekend punt" }, { status: 404 });

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
  return NextResponse.json({ ...vraag, ...(extra ?? {}) });
}
