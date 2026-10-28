import type { createAdminClient } from "@/lib/supabase-admin";

type AdminClient = ReturnType<typeof createAdminClient>;

// Punten toevoegen of verwijderen tijdens een lopend spel, zonder dat teams hun spel kwijtraken.
// Elk team heeft bij de start een eigen volgorde gekregen (session_point_order). Die passen we hier
// mee aan, zodat het aantal punten blijft kloppen (anders sluit de app het spel van het team af).

async function lopendeSessies(admin: AdminClient, routeId: string): Promise<string[]> {
  const { data } = await admin.from("player_sessions").select("id").eq("route_id", routeId).eq("status", "actief");
  return (data ?? []).map((s) => s.id);
}

// Laat de spelers-apps de route opnieuw inlezen (kolom uit migratie 005; ontbreekt hij, dan gebeurt er niets)
async function vraagSpelersTeVernieuwen(admin: AdminClient, routeId: string) {
  try { await admin.from("routes").update({ spelers_vernieuwen_at: new Date().toISOString() }).eq("id", routeId); } catch { /* niet erg */ }
}

// De volgorde van één team gelijktrekken met de punten van de route: punten die er niet meer zijn eruit,
// nieuwe punten vóór de laatste (de finish), en alles weer doornummeren 1, 2, 3, … De eigen volgorde van het
// team blijft verder gelijk. Via tijdelijke negatieve nummers, zodat de unieke regels nergens botsen.
// Geeft false als het niet lukte (dan niets half laten staan is niet te garanderen, maar wel te melden).
export async function herstelTeamVolgorde(admin: AdminClient, sessieId: string, puntIds: string[]): Promise<boolean> {
  const { data: spo, error } = await admin.from("session_point_order")
    .select("id, volgorde, route_point_id").eq("session_id", sessieId).order("volgorde");
  if (error || !spo) return false;
  const inRoute = new Set(puntIds);
  const weg = spo.filter((s) => !inRoute.has(s.route_point_id));
  const blijft = spo.filter((s) => inRoute.has(s.route_point_id));
  const ontbreekt = puntIds.filter((id) => !blijft.some((s) => s.route_point_id === id));
  // Nieuwe punten vóór de laatste van het team (de finish)
  const laatste = blijft[blijft.length - 1];
  const volgorde: { id?: string; punt: string }[] = [
    ...blijft.slice(0, -1).map((s) => ({ id: s.id, punt: s.route_point_id })),
    ...ontbreekt.map((punt) => ({ punt })),
    ...(laatste ? [{ id: laatste.id, punt: laatste.route_point_id }] : []),
  ];
  const alGoed = !weg.length && !ontbreekt.length && blijft.every((s, i) => s.volgorde === i + 1);
  if (alGoed) return true;

  if (weg.length) {
    const { error: f } = await admin.from("session_point_order").delete().in("id", weg.map((s) => s.id));
    if (f) return false;
  }
  // 1. Bestaande rijen tijdelijk negatief, 2. nieuwe rijen erbij, 3. bestaande op hun definitieve nummer
  for (let i = 0; i < volgorde.length; i++) {
    const r = volgorde[i];
    if (!r.id) continue;
    const { error: f } = await admin.from("session_point_order").update({ volgorde: -(i + 1) }).eq("id", r.id);
    if (f) return false;
  }
  const nieuw = volgorde.map((r, i) => ({ r, i })).filter(({ r }) => !r.id)
    .map(({ r, i }) => ({ session_id: sessieId, volgorde: i + 1, route_point_id: r.punt }));
  if (nieuw.length) {
    const { error: f } = await admin.from("session_point_order").insert(nieuw);
    if (f) return false;
  }
  for (let i = 0; i < volgorde.length; i++) {
    const r = volgorde[i];
    if (!r.id) continue;
    const { error: f } = await admin.from("session_point_order").update({ volgorde: i + 1 }).eq("id", r.id);
    if (f) return false;
  }
  return true;
}

// Alle lopende teams van een route gelijktrekken met de route, en pas daarna één keer de spelers-apps laten
// vernieuwen (eerder ging dat per punt, en zag een app tussendoor een route die niet klopte).
export async function werkLopendeSpellenBij(admin: AdminClient, routeId: string): Promise<boolean> {
  const sessies = await lopendeSessies(admin, routeId);
  if (!sessies.length) return true;
  const { data: punten } = await admin.from("route_points").select("id").eq("route_id", routeId).order("order_index");
  const puntIds = (punten ?? []).map((p) => p.id);
  let allesGoed = true;
  for (const sessieId of sessies) {
    if (!await herstelTeamVolgorde(admin, sessieId, puntIds)) allesGoed = false;
  }
  await vraagSpelersTeVernieuwen(admin, routeId);
  return allesGoed;
}

// Nieuw punt: bij elk lopend team vlak vóór de finish in de volgorde
export async function voegPuntToeAanLopendeSpellen(admin: AdminClient, routeId: string, _puntId?: string) {
  return werkLopendeSpellenBij(admin, routeId);
}

// Na het verwijderen van een punt: de volgorde van elk lopend team weer doornummeren (1, 2, 3, …)
export async function hernummerLopendeSpellen(admin: AdminClient, routeId: string) {
  return werkLopendeSpellenBij(admin, routeId);
}
