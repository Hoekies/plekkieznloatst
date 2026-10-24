import { createAdminClient } from "@/lib/supabase-admin";
import { OPSLAG, seizoenPad } from "@/lib/huisstijl";

// 🗓️ Het spellogo van vandaag. Is er voor de feestdag of het seizoen van nu een logo geüpload
// (migratie 020), dan dat; anders het gewone logo. Overal in de app staat /spellogo/… in plaats van
// het vaste bestand, zodat het logo vanzelf meewisselt. Het seizoenslogo komt via onze eigen site
// (geen doorverwijzing naar de opslag), zodat het ook in gemaakte afbeeldingen en PDF's werkt.
export const dynamic = "force-dynamic";

const LOGOS: Record<string, { soort: "logo" | "logo_breed"; standaard: string }> = {
  "vierkant.webp": { soort: "logo", standaard: "/logo.webp" },
  "breed.webp": { soort: "logo_breed", standaard: "/logo-breed-strak.webp" },
  "breed.png": { soort: "logo_breed", standaard: "/logo-breed.png" },   // breed met meer ruimte (kaartje, vraag)
};
// Browser 10 minuten, server-cache een uur: een nieuw seizoen of nieuw logo is er dus binnen een uur
const CACHE = "public, max-age=600, s-maxage=3600, stale-while-revalidate=86400";

export async function GET(request: Request, { params }: { params: { bestand: string } }) {
  const logo = LOGOS[params.bestand];
  if (!logo) return new Response("Niet gevonden", { status: 404 });
  const pad = await seizoenPad(createAdminClient(), logo.soort).catch(() => null);
  if (pad) {
    const res = await fetch(OPSLAG + pad, { cache: "no-store" }).catch(() => null);
    if (res?.ok) return new Response(res.body, { headers: { "Content-Type": res.headers.get("Content-Type") ?? "image/webp", "Cache-Control": CACHE } });
  }
  return new Response(null, { status: 307, headers: { Location: new URL(logo.standaard, request.url).toString(), "Cache-Control": CACHE } });
}
