import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { haalGebruiker, isAdmin } from "@/lib/auth-server";

// 🧩 Puzzelwoord bedenken: de admin geeft een omschrijving ("een ander woord voor slot, 7 letters") en krijgt
// een paar Nederlandse woorden die passen, elk met een korte omschrijving voor de spelers.
// Met ANTHROPIC_API_KEY in Vercel doet Claude het (begrijpt elke omschrijving; een fractie van een cent per keer).
// Zonder sleutel, of als Claude niet lukt: gratis via de synoniemen van Wiktionary (alleen "ander woord voor X").
export const maxDuration = 30;

type Voorstel = { woord: string; omschrijving: string };

// Gratis: synoniemen en verwante woorden van het hoofdwoord uit de Nederlandse Wiktionary, op lengte gefilterd
async function viaWiktionary(vraag: string): Promise<Voorstel[]> {
  const lengte = Number(/(\d+)\s*letter/i.exec(vraag)?.[1]) || null;
  const basis = (/voor\s+(?:een\s+|de\s+|het\s+)?([a-zà-ÿ-]+)/i.exec(vraag)?.[1]
    ?? vraag.replace(/\d+\s*letters?/i, "").split(/[\s,]+/).filter((w) => /^[a-zà-ÿ-]{3,}$/i.test(w)).pop() ?? "").toLowerCase();
  if (!basis) return [];
  const res = await fetch(`https://nl.wiktionary.org/w/api.php?action=parse&page=${encodeURIComponent(basis)}&prop=wikitext&format=json`,
    { headers: { "User-Agent": "PointRush/1.0 (hoekies.nl)" }, signal: AbortSignal.timeout(8000) }).catch(() => null);
  const tekst: string = res?.ok ? (await res.json())?.parse?.wikitext?.["*"] ?? "" : "";
  const stuk = (kop: string) => { const i = tekst.indexOf(kop); return i < 0 ? "" : tekst.slice(i + kop.length, tekst.indexOf("{{-", i + kop.length) >>> 0); };
  const woorden = [...`${stuk("{{-syn-}}")}\n${stuk("{{-rel-}}")}`.matchAll(/\[\[([^\]|#]+)/g)].map((m) => m[1].trim());
  return [...new Set(woorden)]
    .filter((w) => /^[a-zà-ÿ]+$/i.test(w) && w.toLowerCase() !== basis && (!lengte || w.length === lengte))
    .slice(0, 6)
    .map((w) => ({ woord: w.toUpperCase(), omschrijving: `Een ander woord voor ${basis} (${w.length} letters)` }));
}

const Voorstellen = z.object({
  woorden: z.array(z.object({
    woord: z.string().describe("Het woord in hoofdletters, alleen letters A-Z, zonder spaties"),
    omschrijving: z.string().describe("Korte hint voor de spelers, zonder het woord zelf te noemen, met het aantal letters"),
  })),
});

export async function GET(request: NextRequest) {
  if (!isAdmin(await haalGebruiker())) return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });
  const vraag = request.nextUrl.searchParams.get("vraag")?.trim().slice(0, 200);
  if (!vraag) return NextResponse.json({ fout: "Typ eerst een omschrijving" }, { status: 400 });
  // Zonder sleutel: gratis via Wiktionary
  const gratis = async () => {
    const woorden = await viaWiktionary(vraag);
    return woorden.length
      ? NextResponse.json({ woorden, bron: "wiktionary" })
      : NextResponse.json({ fout: "Geen woorden gevonden. Probeer bijv. \"ander woord voor slot, 7 letters\", of typ zelf een woord." }, { status: 404 });
  };
  if (!process.env.ANTHROPIC_API_KEY) return gratis();

  const client = new Anthropic();
  try {
    const antwoord = await client.beta.messages.parse({
      model: "claude-opus-5-5",
      max_tokens: 2000,
      // Een woordpuzzel is een eenvoudige taak: weinig nadenken is genoeg (sneller en goedkoper)
      output_config: { effort: "low", format: betaZodOutputFormat(Voorstellen) },
      // Weigert het model om veiligheidsredenen, dan neemt de server automatisch een ander model
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: "Je helpt bij een speurtocht-spel. Bedenk Nederlandse woorden voor een puzzelwoord: één woord, alleen letters, geen spaties of leestekens, geschikt voor alle leeftijden. Houd je precies aan het gevraagde aantal letters als dat genoemd wordt.",
      messages: [{ role: "user", content: `Geef 5 passende woorden voor: ${vraag}` }],
    });
    if (antwoord.stop_reason === "refusal") return NextResponse.json({ fout: "Daar kan geen voorstel voor gemaakt worden; probeer een andere omschrijving" }, { status: 422 });
    const woorden = (antwoord.parsed_output?.woorden ?? [])
      .map((w) => ({ woord: w.woord.toUpperCase().replace(/[^A-Z]/g, ""), omschrijving: w.omschrijving.trim().slice(0, 120) }))
      .filter((w) => w.woord.length >= 2)
      .slice(0, 6);
    return NextResponse.json({ woorden, bron: "claude" });
  } catch (fout) {
    // Claude lukt niet (sleutel fout, te druk, storing): dan de gratis manier
    if (fout instanceof Anthropic.AuthenticationError) console.error("ANTHROPIC_API_KEY klopt niet");
    else if (!(fout instanceof Anthropic.APIError)) console.error(fout);
    return gratis();
  }
}
