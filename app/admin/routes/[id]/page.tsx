import { haalGebruiker, isAdmin } from "@/lib/auth-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { redirect } from "next/navigation";
import RouteEditorShell from "@/components/admin/RouteEditorShell";

export default async function RouteEditorPage({ params }: { params: { id: string } }) {
  const user = await haalGebruiker();
  if (!isAdmin(user)) redirect("/login");

  const admin = createAdminClient();
  const { data: route } = await admin
    .from("routes")
    .select("*, route_points(*, questions(id, points, type, question_text, correct_text_answers, numeric_answer, answer_options(punten, text, is_correct)))") // vragen: ❓-markering, puntenschatting en naamvoorstel
    .eq("id", params.id)
    .order("order_index", { referencedTable: "route_points" })
    .single();

  if (!route) redirect("/admin/routes");

  return <RouteEditorShell route={route} />;
}
