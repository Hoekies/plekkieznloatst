import { NextResponse } from "next/server";
import { haalGebruiker, isAdmin } from "@/lib/auth-server";
import { createAdminClient } from "@/lib/supabase-admin";

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

  // Startitems horen bij een sessie en verdwijnen; overige items terug naar onopgehaalde staat.
  // Dit gebeurt vóór het verwijderen van de sessies, die anders via claimed_by_session_id vastzitten.
  await admin.from("special_items").delete().eq("is_startitem", true);
  await admin.from("special_items").update({
    claimed: false,
    claimed_by_session_id: null,
    claimed_at: null,
    used_at: null,
  }).not("id", "is", null);

  // Verwijder in de juiste volgorde (FK constraints)
  await admin.from("player_point_progress").delete().not("id", "is", null);
  await admin.from("location_updates").delete().not("id", "is", null);
  await admin.from("special_item_effects").delete().not("id", "is", null);
  await admin.from("foto_inzendingen").delete().not("id", "is", null);
  // De foto's zelf ook uit de opslag, zodat die niet volloopt
  const fotosVerwijderd = await leegFotoOpslag(admin);
  // session_point_order cascadet mee via ON DELETE CASCADE
  await admin.from("player_sessions").delete().not("id", "is", null);

  // Handmatige tussenstand-trigger leegmaken zodat 'ie niet doorspookt in de nieuwe game
  await admin.from("routes").update({ tussenstand_trigger_at: null, uitslag_vrijgegeven: false }).not("id", "is", null);

  return NextResponse.json({ ok: true, fotos_verwijderd: fotosVerwijderd });
}
