import type { createAdminClient } from "@/lib/supabase-admin";
import { boekScoreOver } from "@/lib/score";
import { DUEL_VRAGEN, DUEL_SECONDEN, DUEL_PAUZE_MIN } from "@/lib/duel-vragen";

type AdminClient = ReturnType<typeof createAdminClient>;

// ⚔️ Duel (migratie 006): twee teams binnen 25 meter van elkaar krijgen dezelfde snelle vraag; wie het eerst goed
// is pakt punten van de ander. Per route aan of uit (routes.duel_aan). Zonder migratie doet dit niets.

export type Duel = {
  id: string; route_id: string; sessie_a: string; sessie_b: string; vraag_nr: number; punten: number; gestart_op: string;
  antwoord_a: number | null; antwoord_b: number | null; winnaar: string | null; buit: number; afgerond_op: string | null;
};

const verlopen = (d: Duel, nu = Date.now()) => nu >= Date.parse(d.gestart_op) + DUEL_SECONDEN * 1000;

// Vanuit /api/speler/locaties: dit team is dichtbij deze andere teams. Start een duel als dat mag.
export async function startDuels(admin: AdminClient, route: { id: string; duel_aan?: boolean | null; duel_punten?: number | null }, eigen: string, dichtbij: string[]) {
  if (!route.duel_aan || !dichtbij.length) return;
  const sinds = new Date(Date.now() - DUEL_PAUZE_MIN * 60_000).toISOString();
  for (const ander of dichtbij) {
    const [a, b] = eigen < ander ? [eigen, ander] : [ander, eigen];
    // Al een open duel voor een van de twee, of deze twee hadden net nog een duel? Dan niet
    const { data: bezig } = await admin.from("duels").select("id, sessie_a, sessie_b, gestart_op, afgerond_op")
      .or(`sessie_a.in.(${a},${b}),sessie_b.in.(${a},${b})`).or(`afgerond_op.is.null,gestart_op.gt.${sinds}`);
    if ((bezig ?? []).some((d) => !d.afgerond_op || (d.sessie_a === a && d.sessie_b === b))) continue;
    // Een vraag die geen van beide teams al had
    const { data: gehad } = await admin.from("duels").select("vraag_nr").or(`sessie_a.in.(${a},${b}),sessie_b.in.(${a},${b})`);
    const gebruikt = new Set((gehad ?? []).map((d) => d.vraag_nr));
    const vrij = DUEL_VRAGEN.map((_, i) => i).filter((i) => !gebruikt.has(i));
    const pool = vrij.length ? vrij : DUEL_VRAGEN.map((_, i) => i);
    // De unieke index laat maar één open duel per tweetal toe: tegelijk starten gaat dus nooit dubbel
    await admin.from("duels").insert({
      route_id: route.id, sessie_a: a, sessie_b: b, vraag_nr: pool[Math.floor(Math.random() * pool.length)],
      punten: Math.max(1, Math.min(500, route.duel_punten ?? 25)),
    }).then(() => undefined, () => undefined);
    return; // één duel tegelijk
  }
}

// Het duel van dit team: open, of net afgelopen (om de uitslag te laten zien). Verlopen duels worden afgesloten.
export async function mijnDuel(admin: AdminClient, sessieId: string): Promise<Duel | null> {
  const sinds = new Date(Date.now() - 2 * DUEL_SECONDEN * 1000).toISOString();
  const { data } = await admin.from("duels").select("*").or(`sessie_a.eq.${sessieId},sessie_b.eq.${sessieId}`)
    .gt("gestart_op", sinds).order("gestart_op", { ascending: false }).limit(1).maybeSingle();
  const d = data as Duel | null;
  if (d && !d.afgerond_op && verlopen(d)) {
    const nu = new Date().toISOString();
    await admin.from("duels").update({ afgerond_op: nu }).eq("id", d.id).is("afgerond_op", null);
    d.afgerond_op = nu;
  }
  return d;
}

// Antwoord van een team. Goed en nog geen winnaar: dit team wint en pakt de punten van de ander.
export async function beantwoordDuel(admin: AdminClient, d: Duel, sessieId: string, keuze: number)
  : Promise<{ ok: true; goed: boolean; gewonnen: boolean; buit: number } | { ok: false; fout: string }> {
  if (d.afgerond_op || verlopen(d)) return { ok: false, fout: "Dit duel is al voorbij" };
  const kolom = d.sessie_a === sessieId ? "antwoord_a" : d.sessie_b === sessieId ? "antwoord_b" : null;
  if (!kolom) return { ok: false, fout: "Dit is niet jullie duel" };
  // Eén antwoord per team
  const { data: gezet } = await admin.from("duels").update({ [kolom]: keuze }).eq("id", d.id).is(kolom, null).is("afgerond_op", null).select("*");
  if (!gezet?.length) return { ok: false, fout: "Jullie hebben al geantwoord" };
  const nu = gezet[0] as Duel;
  const goed = keuze === DUEL_VRAGEN[d.vraag_nr]?.goed;
  if (goed) {
    const { data: winst } = await admin.from("duels").update({ winnaar: sessieId, afgerond_op: new Date().toISOString() })
      .eq("id", d.id).is("winnaar", null).is("afgerond_op", null).select("id");
    if (winst?.length) {
      const ander = d.sessie_a === sessieId ? d.sessie_b : d.sessie_a;
      const buit = await boekScoreOver(admin, ander, sessieId, d.punten).catch(() => 0);
      await admin.from("duels").update({ buit }).eq("id", d.id);
      return { ok: true, goed, gewonnen: true, buit };
    }
    return { ok: true, goed, gewonnen: false, buit: 0 };
  }
  // Fout: hebben ze allebei geantwoord (en niemand goed), dan is het duel klaar
  if (nu.antwoord_a !== null && nu.antwoord_b !== null) {
    await admin.from("duels").update({ afgerond_op: new Date().toISOString() }).eq("id", d.id).is("afgerond_op", null);
  }
  return { ok: true, goed, gewonnen: false, buit: 0 };
}
