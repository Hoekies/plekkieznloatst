import { NextRequest, NextResponse } from "next/server";
import { haalSpelerSessie } from "@/lib/speler-sessie";
import { WRAAK_EMOJI } from "@/lib/wraak";

// 😤 Wraak: wie door een item van een ander team geraakt is, stuurt met één tik een emoji terug. Alleen een
// melding bij dat team (geen punten), en per item maar één keer.

export async function POST(request: NextRequest) {
  const ctx = await haalSpelerSessie({ ookVoltooid: true });
  if (!ctx?.sessie) return NextResponse.json({ fout: "Geen spel" }, { status: 403 });
  const { admin, sessie, spelerId } = ctx;
  const body = await request.json().catch(() => ({})) as { special_item_id?: string; emoji?: string };
  const emoji = (WRAAK_EMOJI as readonly string[]).includes(body.emoji ?? "") ? body.emoji! : null;
  if (!body.special_item_id || !emoji) return NextResponse.json({ fout: "Kies een emoji" }, { status: 400 });

  // Alleen een item dat ons echt raakte, van een ander team
  const [{ data: geraakt }, { data: item }] = await Promise.all([
    admin.from("special_item_effects").select("id").eq("special_item_id", body.special_item_id).eq("target_session_id", sessie.id).maybeSingle(),
    admin.from("special_items").select("id, type, claimed_by_session_id").eq("id", body.special_item_id).maybeSingle(),
  ]);
  const aanvaller = item?.claimed_by_session_id;
  if (!geraakt || !aanvaller || aanvaller === sessie.id) return NextResponse.json({ fout: "Dit kun je niet beantwoorden" }, { status: 400 });

  // Eén keer per item
  const { data: al } = await admin.from("special_item_effects").select("id").eq("special_item_id", item.id).eq("target_session_id", aanvaller).maybeSingle();
  if (al) return NextResponse.json({ fout: "Je hebt al iets teruggestuurd" }, { status: 409 });

  const { data: ik } = await admin.from("players").select("nickname, login_name").eq("id", spelerId).maybeSingle();
  const naam = ik?.nickname ?? ik?.login_name ?? "Een team";
  const { error } = await admin.from("special_item_effects").insert({
    special_item_id: item.id, target_session_id: aanvaller, effect_type: "punt_aftrek", expires_at: null,
    notification: `${emoji} Team ${naam} stuurt een ${emoji} terug voor jullie ${item.type}!`,
  });
  if (error) return NextResponse.json({ fout: "Versturen lukte niet" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
