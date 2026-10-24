import { NextRequest, NextResponse } from "next/server";
import { haalGebruiker, isAdmin } from "@/lib/auth-server";
import { createAdminClient } from "@/lib/supabase-admin";

// ✏️ Teamnaam aanpassen door de beheerder (bijv. een ongepaste naam): PATCH { nickname }
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await haalGebruiker();
  if (!isAdmin(user)) return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });
  if (!/^[0-9a-f-]{36}$/i.test(params.id)) return NextResponse.json({ fout: "Ongeldig id" }, { status: 400 });
  const body = await request.json().catch(() => null);
  // Zelfde regel als bij de speler zelf: hooguit 30 tekens; leeg = de speler kiest opnieuw
  const naam = typeof body?.nickname === "string" ? body.nickname.trim().slice(0, 30) : null;
  if (naam === null) return NextResponse.json({ fout: "Teamnaam ontbreekt" }, { status: 400 });
  const { error } = await createAdminClient().from("players").update({ nickname: naam || null }).eq("id", params.id);
  if (error) return NextResponse.json({ fout: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, nickname: naam || null });
}

// Een speler helemaal verwijderen: inlogaccount, spellen (score, antwoorden, gelopen route, foto's)
// en zijn regels in het itemlogboek. Daarna is de loginnaam weer vrij.
// Niet zolang er een spel loopt: dan eerst "Stop spel" (voorkomt een vergissing midden in het spel).
export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const user = await haalGebruiker();
  if (!isAdmin(user)) return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });
  if (!/^[0-9a-f-]{36}$/i.test(params.id)) return NextResponse.json({ fout: "Ongeldig id" }, { status: 400 });

  const admin = createAdminClient();
  const { data: speler } = await admin.from("players").select("id, auth_user_id, login_name, nickname").eq("id", params.id).maybeSingle();
  if (!speler) return NextResponse.json({ fout: "Deze speler bestaat niet (meer)" }, { status: 404 });

  const { data: sessies } = await admin.from("player_sessions").select("id, status").eq("player_id", speler.id);
  if ((sessies ?? []).some((s) => s.status === "actief")) {
    return NextResponse.json({ fout: "Deze speler is nog aan het spelen. Stop eerst het spel." }, { status: 409 });
  }
  const sessieIds = (sessies ?? []).map((s) => s.id);

  if (sessieIds.length) {
    // Startitems horen bij een spel en zouden anders los blijven hangen
    await admin.from("special_items").delete().eq("is_startitem", true).in("claimed_by_session_id", sessieIds);
    // Ingestuurde foto's uit de opslag (map per spel)
    const opslag = admin.storage.from("foto-inzendingen");
    for (const id of sessieIds) {
      const { data: bestanden } = await opslag.list(id, { limit: 1000 });
      if (bestanden?.length) await opslag.remove(bestanden.map((b) => `${id}/${b.name}`));
    }
  }

  // Het inlogaccount verwijderen; via de database gaan speler, spellen, voortgang, foto's en logboek mee
  const { error } = await admin.auth.admin.deleteUser(speler.auth_user_id);
  if (error) {
    // Account bestond al niet meer: dan de speler zelf opruimen
    const { error: fout } = await admin.from("players").delete().eq("id", speler.id);
    if (fout) return NextResponse.json({ fout: fout.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, naam: speler.nickname ?? speler.login_name });
}
