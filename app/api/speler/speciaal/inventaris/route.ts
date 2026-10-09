import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { haalItemSessie } from "@/lib/item-sessie";

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ fout: "Niet ingelogd" }, { status: 403 });

  const admin = createAdminClient();
  const { data: speler } = await admin.from("players").select("id").eq("auth_user_id", user.id).maybeSingle();
  if (!speler) return NextResponse.json([]);

  // Lopend spel, of na de finish als de route dat toestaat (tot de uitslag vrij is)
  const itemSessie = await haalItemSessie(admin, speler.id);
  if (!itemSessie) return NextResponse.json([]);
  const sessie = itemSessie.sessie;

  const { data: items } = await admin
    .from("special_items")
    .select("*")
    .eq("claimed_by_session_id", sessie.id)
    .is("used_at", null);

  // Na de finish alleen de items die de beheerder daarvoor heeft aangezet
  return NextResponse.json((items ?? []).filter((i) => !itemSessie.naFinish || itemSessie.toegestaan.includes(i.type)));
}
