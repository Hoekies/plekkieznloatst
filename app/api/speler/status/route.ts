import { NextResponse } from "next/server";
import { GET as sessie } from "../sessie/route";
import { GET as speciaal } from "../speciaal/route";
import { GET as effecten } from "../speciaal/effecten/route";
import { GET as berichten } from "../berichten/route";
import { GET as tussenstand } from "../tussenstand/route";
import { GET as testteam } from "../testteam/route";

// Alles wat de spelersapp elke paar seconden nodig heeft in één verzoek: score en sessie,
// items op de kaart, aanvallen en effecten, berichten en de tussenstand. Scheelt per speler
// vijf losse verzoeken (en vijf keer de inlogcontrole in de middleware).
// Elk deel komt terug als { status, data }, precies zoals het losse verzoek het zou geven.
export async function GET() {
  const deel = async (handler: () => Promise<Response>) => {
    try {
      const res = await handler();
      return { status: res.status, data: await res.json() };
    } catch {
      return { status: 500, data: null };
    }
  };
  // 🧪 testteam: eerst laten gooien, zodat een verse worp meteen bij de effecten zit
  await deel(testteam);
  const [s, i, e, b, t] = await Promise.all([deel(sessie), deel(speciaal), deel(effecten), deel(berichten), deel(tussenstand)]);
  return NextResponse.json({ sessie: s, speciaal: i, effecten: e, berichten: b, tussenstand: t });
}
