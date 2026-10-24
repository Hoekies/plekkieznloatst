import { NextResponse } from "next/server";
import { haalItemSessie } from "@/lib/item-sessie";
import { haalSpeler } from "@/lib/speler-sessie";

export async function GET() {
  const ik = await haalSpeler();
  if (!ik) return NextResponse.json([]);
  const { admin, spelerId } = ik;

  // Lopend spel, of na de finish als de route dat toestaat (tot de uitslag vrij is)
  const itemSessie = await haalItemSessie(admin, spelerId);
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
