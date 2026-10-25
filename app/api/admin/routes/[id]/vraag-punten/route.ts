import { NextRequest, NextResponse } from "next/server";
import { haalGebruiker, isAdmin } from "@/lib/auth-server";
import { createAdminClient } from "@/lib/supabase-admin";

// ❓ Alle vragen van de route op hetzelfde aantal punten zetten (route-instellingen → Punten). Eigen punten per
// antwoord blijven staan.
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  if (!isAdmin(await haalGebruiker())) return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });
  const body = await request.json().catch(() => null);
  const punten = Math.round(Number(body?.punten));
  if (!Number.isFinite(punten) || punten < 0) return NextResponse.json({ fout: "Vul een aantal punten in" }, { status: 400 });
  const admin = createAdminClient();
  const { data: puntenRij } = await admin.from("route_points").select("id").eq("route_id", params.id);
  const ids = (puntenRij ?? []).map((p) => p.id);
  if (!ids.length) return NextResponse.json({ aantal: 0 });
  const { data, error } = await admin.from("questions").update({ points: punten }).in("route_point_id", ids).select("route_point_id, points, answer_options(punten)");
  if (error) return NextResponse.json({ fout: error.message }, { status: 500 });
  // Per vraag de hoogste punten (eigen punten per antwoord kunnen hoger zijn), voor "max te halen"
  const max = Object.fromEntries((data ?? []).map((v) => {
    const perAntwoord = ((v.answer_options ?? []) as { punten: number | null }[]).map((o) => o.punten).filter((n): n is number => typeof n === "number");
    return [v.route_point_id, Math.max(v.points ?? 0, ...perAntwoord)];
  }));
  return NextResponse.json({ aantal: data?.length ?? 0, max });
}
