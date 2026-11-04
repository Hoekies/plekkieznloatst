import { createAdminClient } from "@/lib/supabase-admin";
import { seizoenBeeld } from "@/lib/huisstijl";

// 🗓️ Het spellogo van vandaag: van de feestdag of het seizoen van nu (geüpload, anders de standaard uit
// public/seizoenen); het gewone logo alleen bij een vastgezet vrij thema zonder logo. Overal in de app staat /spellogo/… in plaats van
// het vaste bestand, zodat het logo vanzelf meewisselt. Het seizoenslogo komt via onze eigen site
// (geen doorverwijzing naar de opslag), zodat het ook in gemaakte afbeeldingen en PDF's werkt.
export const dynamic = "force-dynamic";

const LOGOS: Record<string, { soort: "logo" | "logo_breed"; standaard: string }> = {
  "vierkant.webp": { soort: "logo", standaard: "/logo.webp" },
  "breed.webp": { soort: "logo_breed", standaard: "/logo-breed-strak.webp" },
  "breed.png": { soort: "logo_breed", standaard: "/logo-breed.png" },   // breed met meer ruimte (kaartje, vraag)
};
// Browser en server-cache 5 minuten: een nieuw seizoen, nieuw logo of vastgezet thema is er dus snel
const CACHE = "public, max-age=300, s-maxage=300, stale-while-revalidate=600";

export async function GET(request: Request, { params }: { params: { bestand: string } }) {
  const logo = LOGOS[params.bestand];
  if (!logo) return new Response("Niet gevonden", { status: 404 });
  const beeld = await seizoenBeeld(createAdminClient(), logo.soort).catch(() => null);
  // Geüpload (volledig adres): via onze eigen site doorgeven
  if (beeld?.startsWith("http")) {
    const res = await fetch(beeld, { cache: "no-store" }).catch(() => null);
    if (res?.ok) return new Response(res.body, { headers: { "Content-Type": res.headers.get("Content-Type") ?? "image/webp", "Cache-Control": CACHE } });
  }
  // Staat al op onze eigen site: de standaard van het thema, of anders het gewone logo
  const adres = beeld && !beeld.startsWith("http") ? beeld : logo.standaard;
  return new Response(null, { status: 307, headers: { Location: new URL(adres, request.url).toString(), "Cache-Control": CACHE } });
}
