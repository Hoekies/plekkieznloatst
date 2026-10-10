import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";

// Volledige kopie van een route als basis voor een nieuwe: alle instellingen, punten,
// vragen met antwoorden en de items op de kaart. De kopie is altijd een concept en niet actief.
export async function POST(_: Request, { params }: { params: { id: string } }) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.app_metadata?.rol !== "admin") return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });

  const admin = createAdminClient();
  const { data: bron } = await admin.from("routes").select("*").eq("id", params.id).maybeSingle();
  if (!bron) return NextResponse.json({ fout: "Route niet gevonden" }, { status: 404 });

  // Spelstand en tijdstempels horen bij het origineel, niet bij de kopie
  const {
    id: _id, created_at: _c, updated_at: _u, is_active: _a, status: _s,
    uitslag_vrijgegeven: _v, tussenstand_trigger_at: _t, items_last_rotated_at: _r, ...instellingen
  } = bron;
  void [_id, _c, _u, _a, _s, _v, _t, _r];
  const { data: kopie, error } = await admin
    .from("routes")
    .insert({ ...instellingen, name: `${bron.name} (kopie)`, status: "concept", is_active: false })
    .select("id")
    .single();
  if (error || !kopie) return NextResponse.json({ fout: error?.message ?? "Kopiëren mislukt" }, { status: 500 });

  // Punten met hun vraag en antwoorden
  const { data: punten } = await admin
    .from("route_points")
    .select("*, questions(*, answer_options(*))")
    .eq("route_id", params.id)
    .order("order_index");
  for (const p of punten ?? []) {
    const { id: _pid, route_id: _rid, created_at: _pc, updated_at: _pu, questions, ...punt } = p;
    void [_pid, _rid, _pc, _pu];
    const { data: nieuwPunt } = await admin.from("route_points").insert({ ...punt, route_id: kopie.id }).select("id").single();
    const vraag = questions?.[0];
    if (!nieuwPunt || !vraag) continue;
    const { id: _qid, route_point_id: _qp, created_at: _qc, updated_at: _qu, answer_options, ...vraagVelden } = vraag;
    void [_qid, _qp, _qc, _qu];
    const { data: nieuweVraag } = await admin.from("questions").insert({ ...vraagVelden, route_point_id: nieuwPunt.id }).select("id").single();
    if (!nieuweVraag || !answer_options?.length) continue;
    await admin.from("answer_options").insert(
      (answer_options as Record<string, unknown>[]).map(({ id: _oid, question_id: _oq, ...optie }) => {
        void [_oid, _oq];
        return { ...optie, question_id: nieuweVraag.id };
      }),
    );
  }

  // Items op de kaart (geen startitems, die horen bij een gespeelde sessie), als nieuw
  const { data: items } = await admin.from("special_items").select("*").eq("route_id", params.id).eq("is_startitem", false);
  if (items?.length) {
    await admin.from("special_items").insert(items.map((i) => ({
      route_id: kopie.id, type: i.type, name: i.name, latitude: i.latitude, longitude: i.longitude,
      radius_meters: i.radius_meters, points_effect: i.points_effect,
    })));
  }

  return NextResponse.json({ id: kopie.id });
}
