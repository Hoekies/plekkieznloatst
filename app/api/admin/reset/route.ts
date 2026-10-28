import { NextResponse } from "next/server";
import { haalGebruiker, isAdmin } from "@/lib/auth-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { bewaarVraagStatistiek } from "@/lib/vraag-statistiek";

type AdminClient = ReturnType<typeof createAdminClient>;

// Alle ingestuurde foto's uit de opslag halen (ook achtergebleven foto's van eerdere resets).
// Ze staan als <sessie-id>/<punt-id>.<ext>; lege mappen verdwijnen vanzelf.
async function leegFotoOpslag(admin: AdminClient): Promise<number> {
  const opslag = admin.storage.from("foto-inzendingen");
  let verwijderd = 0;
  for (let ronde = 0; ronde < 50; ronde++) {
    const { data: inhoud } = await opslag.list("", { limit: 100 });
    if (!inhoud?.length) break;
    const paden: string[] = [];
    for (const item of inhoud) {
      if (item.id) { paden.push(item.name); continue; }  // los bestand in de hoofdmap
      const { data: bestanden } = await opslag.list(item.name, { limit: 1000 });
      (bestanden ?? []).forEach((b) => paden.push(`${item.name}/${b.name}`));
    }
    if (!paden.length) break;
    for (let i = 0; i < paden.length; i += 100) await opslag.remove(paden.slice(i, i + 100));
    verwijderd += paden.length;
  }
  return verwijderd;
}

export async function POST() {
  const user = await haalGebruiker();
  if (!isAdmin(user)) {
    return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });
  }

  const admin = createAdminClient();

  // Elke stap wordt gecontroleerd: mislukt er een, dan stopt het opruimen en zegt de melding welke stap.
  // (Supabase gooit geen fout bij een mislukte opdracht; die staat in `error`.) De foto's uit de opslag gaan
  // pas als laatste weg, als de database al gelukt is: anders bleven gegevens zonder foto achter.
  const stap = async (naam: string, opdracht: PromiseLike<{ error: { message: string } | null }>) => {
    const { error } = await opdracht;
    if (error) throw new Error(`${naam}: ${error.message}`);
  };

  let fotosVerwijderd = 0;
  try {
    // Startitems horen bij een sessie en verdwijnen; overige items terug naar onopgehaalde staat.
    // Dit gebeurt vóór het verwijderen van de sessies, die anders via claimed_by_session_id vastzitten.
    await stap("Startitems weghalen", admin.from("special_items").delete().eq("is_startitem", true));
    await stap("Items terugleggen", admin.from("special_items").update({
      claimed: false,
      claimed_by_session_id: null,
      claimed_at: null,
      used_at: null,
    }).not("id", "is", null));

    // 📊 Eerst per vraag optellen hoe vaak die goed ging (blijft bewaard bij de route, migratie 022)
    await bewaarVraagStatistiek(admin);

    // Verwijder in de juiste volgorde (FK constraints)
    await stap("Antwoorden wissen", admin.from("player_point_progress").delete().not("id", "is", null));
    await stap("Gelopen routes wissen", admin.from("location_updates").delete().not("id", "is", null));
    await stap("Itemeffecten wissen", admin.from("special_item_effects").delete().not("id", "is", null));
    await stap("Foto-inzendingen wissen", admin.from("foto_inzendingen").delete().not("id", "is", null));
    // session_point_order cascadet mee via ON DELETE CASCADE
    await stap("Spellen wissen", admin.from("player_sessions").delete().not("id", "is", null));

    // Alles wat bij een speelronde hoort terug naar het begin: tussenstand, uitslag, eindtijd en pauze.
    // Anders kon een verstreken eindtijd de volgende groep meteen tegenhouden ("Het spel is afgelopen").
    await stap("Route terugzetten", admin.from("routes")
      .update({ tussenstand_trigger_at: null, uitslag_vrijgegeven: false, eindtijd: null, gepauzeerd_sinds: null })
      .not("id", "is", null));
    // Stemvragen weer open (de stemmen zelf zijn al gewist)
    await stap("Stemvragen openen", admin.from("questions").update({ stem_gesloten: false }).eq("type", "stemvraag"));

    // De foto's zelf ook uit de opslag, zodat die niet volloopt
    fotosVerwijderd = await leegFotoOpslag(admin);
  } catch (e) {
    return NextResponse.json({ fout: `Opruimen is halverwege gestopt. ${(e as Error).message}. Probeer het opnieuw.` }, { status: 500 });
  }

  return NextResponse.json({ ok: true, fotos_verwijderd: fotosVerwijderd });
}
