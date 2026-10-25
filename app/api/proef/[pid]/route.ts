import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";

// 🧪 Proefversie van één vraag via de QR-code uit de vraag-editor: zonder inloggen, maar alleen met de geheime
// code van dat punt (en "Openen met QR-code" aan). Geeft het punt en de vraag mét de goede antwoorden, zodat de
// telefoon zelf kan beoordelen; er wordt niets opgeslagen.
export async function GET(request: NextRequest, { params }: { params: { pid: string } }) {
  const geheim = request.nextUrl.searchParams.get("s");
  const admin = createAdminClient();
  const { data: punt } = await admin.from("route_points").select("id, name, type, description, image_path, qr_unlock_enabled, qr_secret").eq("id", params.pid).maybeSingle();
  if (!punt || !geheim || !punt.qr_unlock_enabled || punt.qr_secret !== geheim) {
    return NextResponse.json({ fout: "Deze QR-code werkt niet (meer). Zet in de vraag-editor Openen met QR-code aan en print hem opnieuw." }, { status: 404 });
  }
  const { data: vraag } = await admin.from("questions").select("*, answer_options(*)").eq("route_point_id", punt.id)
    .order("order_index", { referencedTable: "answer_options" }).maybeSingle();
  const { qr_unlock_enabled: _q, qr_secret: _s, ...openbaar } = punt;
  return NextResponse.json({ punt: openbaar, vraag: vraag ?? null }, { headers: { "Cache-Control": "no-store" } });
}
