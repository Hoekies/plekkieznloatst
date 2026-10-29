import { NextResponse } from "next/server";
import { haalSpeler } from "@/lib/speler-sessie";
import { testAutoWorp } from "@/lib/testteam";

// 🧪 Elke paar seconden (via /api/speler/status): speelt dit een testteam, dan gooit de testtegenstander af en
// toe vanzelf een item. Voor echte teams doet dit niets.
export async function GET() {
  const ik = await haalSpeler();
  if (!ik) return NextResponse.json({});
  await testAutoWorp(ik.admin, ik.spelerId).catch(() => undefined);
  return NextResponse.json({});
}
