import { serverFout } from "@/lib/server-fout";
import { NextResponse } from "next/server";
import { haalGebruiker } from "@/lib/auth-server";
import { createAdminClient } from "@/lib/supabase-admin";

export async function GET() {
  const user = await haalGebruiker();
  if (!user) return NextResponse.json({ fout: "Niet ingelogd" }, { status: 401 });

  const admin = createAdminClient();
  const { data: spelers, error } = await admin
    .from("players")
    .select("icon")
    .eq("is_uitgeschakeld", false);

  if (error) return serverFout(error, "/api/speler/iconen");

  const gebruikt = (spelers ?? [])
    .map((s) => s.icon)
    .filter((icon): icon is string => !!icon);

  return NextResponse.json({ gebruikt });
}
