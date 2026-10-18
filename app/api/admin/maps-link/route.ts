import { NextRequest, NextResponse } from "next/server";
import { haalGebruiker, isAdmin } from "@/lib/auth-server";

// Korte deellink uit de Google Maps-app (maps.app.goo.gl/…) uitpakken tot de lange link,
// zodat de route-editor er de coördinaten uit kan halen. Alleen Google-adressen.
const TOEGESTAAN = /^(maps\.app\.goo\.gl|goo\.gl|g\.co|(www\.|maps\.)?google\.[a-z.]+)$/i;

function veiligDecoderen(s: string) {
  try { return decodeURIComponent(s); } catch { return s; }
}

export async function GET(request: NextRequest) {
  if (!isAdmin(await haalGebruiker())) return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });
  let url = request.nextUrl.searchParams.get("url") ?? "";
  for (let i = 0; i < 5; i++) {
    let host = "";
    try { host = new URL(url).hostname; } catch { return NextResponse.json({ fout: "Ongeldige link" }, { status: 400 }); }
    if (!TOEGESTAAN.test(host)) return NextResponse.json({ fout: "Geen Google Maps-link" }, { status: 400 });
    // Lange link met coördinaten: klaar
    if (/google\./i.test(host) && /(!3d|@|[?&](q|query|ll)=)-?\d/.test(veiligDecoderen(url))) return NextResponse.json({ url });
    const res = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(5000) }).catch(() => null);
    const volgende = res?.headers.get("location");
    if (!volgende) return NextResponse.json({ url });
    url = new URL(volgende, url).toString();
  }
  return NextResponse.json({ url });
}
