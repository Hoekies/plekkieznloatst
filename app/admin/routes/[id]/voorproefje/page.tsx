import { haalGebruiker } from "@/lib/auth-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { redirect } from "next/navigation";
import RouteVoorproefje, { type VoorproefData } from "@/components/admin/RouteVoorproefje";

// Voorproefje van een route op één A4: speelgebied, kerngetallen, een paar voorbeeldvragen
// (zonder antwoorden) en de items. Om te laten zien wat een route inhoudt, zonder hem te verraden.
export default async function VoorproefjePagina({ params }: { params: { id: string } }) {
  const user = await haalGebruiker();
  if (!user || user.app_metadata?.rol !== "admin") redirect("/login");

  const admin = createAdminClient();
  const { data: route } = await admin.from("routes").select("*").eq("id", params.id).maybeSingle();
  if (!route) redirect("/admin/routes");

  const [{ data: punten }, { data: items }] = await Promise.all([
    admin.from("route_points")
      .select("id, name, type, latitude, longitude, order_index, questions(id, type, question_text, question_image_path, points, answer_options(id, order_index, color, answer_type, text, image_path))")
      .eq("route_id", route.id).order("order_index"),
    admin.from("special_items").select("id, type, latitude, longitude").eq("route_id", route.id).eq("is_startitem", false),
  ]);

  type PuntRij = {
    id: string; name: string; type: string; latitude: number; longitude: number; order_index: number;
    questions: { id: string; type: string; question_text: string; question_image_path: string | null; points: number;
      answer_options: { id: string; order_index: number; color: string; answer_type: string; text: string | null; image_path: string | null }[] }[] | null;
  };
  const puntRijen = (punten ?? []) as PuntRij[];

  // Bewust zonder is_correct, juiste antwoorden en puntnamen: die komen nooit in de browser
  const data: VoorproefData = {
    route: {
      id: route.id, name: route.name, modus: route.modus,
      ster: route.ster_waarde ?? 10, bom: route.bom_waarde ?? 10,
      spookSec: route.spook_duur_seconden ?? 60, plekzooiSec: route.plekzooi_duur_seconden ?? 30,
    },
    punten: puntRijen.map((p) => ({ lat: p.latitude, lng: p.longitude, eind: p.type === "eindpunt" })),
    vragen: puntRijen.flatMap((p) => (p.questions ?? []).map((v) => ({
      id: v.id, type: v.type, tekst: v.question_text, afbeelding: v.question_image_path, punten: v.points,
      opties: [...(v.answer_options ?? [])].sort((a, b) => a.order_index - b.order_index)
        .map((o) => ({ id: o.id, kleur: o.color, tekst: o.text, afbeelding: o.answer_type === "afbeelding" ? o.image_path : null })),
    }))),
    items: (items ?? []).map((i) => ({ id: i.id, type: i.type, lat: i.latitude, lng: i.longitude })),
  };

  return <RouteVoorproefje data={data} />;
}
