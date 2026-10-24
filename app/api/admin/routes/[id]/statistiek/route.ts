import { NextRequest, NextResponse } from "next/server";
import { haalGebruiker, isAdmin } from "@/lib/auth-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { telHuidig, telOp, type Telling } from "@/lib/vraag-statistiek";

// 📊 Per punt van deze route: hoe vaak de vraag goed ging, over alle spellen (bewaard + het huidige spel)
export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  if (!isAdmin(await haalGebruiker())) return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });
  const admin = createAdminClient();
  const { data } = await admin.from("routes").select("vraag_statistiek").eq("id", params.id).maybeSingle();
  const bewaard = ((data as { vraag_statistiek?: Telling } | null)?.vraag_statistiek ?? {}) as Telling;
  const huidig = (await telHuidig(admin, params.id))[params.id] ?? {};
  return NextResponse.json(telOp(bewaard, huidig));
}
