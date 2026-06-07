import { createServerSupabaseClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { redirect } from "next/navigation";
import VraagEditorPagina from "@/components/admin/VraagEditorPagina";

export default async function PuntEditorPage({
  params,
}: {
  params: { id: string; pid: string };
}) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.app_metadata?.rol !== "admin") redirect("/login");

  const admin = createAdminClient();

  const [{ data: punt }, { data: vraag }] = await Promise.all([
    admin.from("route_points").select("*").eq("id", params.pid).single(),
    admin
      .from("questions")
      .select("*, answer_options(*)")
      .eq("route_point_id", params.pid)
      .order("order_index", { referencedTable: "answer_options" })
      .maybeSingle(),
  ]);

  if (!punt) redirect(`/admin/routes/${params.id}`);

  return (
    <VraagEditorPagina
      routeId={params.id}
      punt={punt}
      bestaandeVraag={vraag ?? null}
    />
  );
}
