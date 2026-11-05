import { NextRequest, NextResponse } from "next/server";
import { haalSpelerSessie } from "@/lib/speler-sessie";
import { meespeelSleutel } from "@/lib/meespelen";

// 🤝 De meespeellink van het eigen spel, om te delen met medespelers
export async function GET(request: NextRequest) {
  const ctx = await haalSpelerSessie();
  if (!ctx) return NextResponse.json({ fout: "Niet ingelogd" }, { status: 403 });
  const { admin, sessie } = ctx;
  if (!sessie) return NextResponse.json({ fout: "Er loopt nu geen spel" }, { status: 404 });
  const { data: route } = await admin.from("routes").select("*").eq("id", sessie.route_id).maybeSingle();
  if ((route as { meespeellink?: boolean | null } | null)?.meespeellink === false) {
    return NextResponse.json({ fout: "De spelleider heeft meekijken op deze route uitgezet" }, { status: 403 });
  }
  return NextResponse.json({ url: `${request.nextUrl.origin}/meespelen/${sessie.id}/${meespeelSleutel(sessie.id)}` }, { headers: { "Cache-Control": "no-store" } });
}
