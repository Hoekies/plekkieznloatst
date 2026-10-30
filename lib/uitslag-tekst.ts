import type { createAdminClient } from "@/lib/supabase-admin";
import { maakStand } from "@/lib/stand";
import { spelStatistieken, type TeamStatistiek } from "@/lib/statistieken";
import { huisLogoUrl } from "@/lib/huisstijl";

type AdminClient = ReturnType<typeof createAdminClient>;

// 💬 De hele uitslag als één WhatsApp-bericht voor de groepsapp: de stand met de prijzen, per team de cijfers en de
// records. *vet* is WhatsApp-opmaak. Alleen echte teams (geen 🧪 test).

const getal = (x: number) => x.toString().replace(".", ",");

// De cijfers van één team in één regel (alleen wat er te melden is)
export function cijferRegel(s: TeamStatistiek): string {
  return [
    `✅ ${s.goed}`, s.fout ? `❌ ${s.fout}` : "", s.overgeslagen ? `⏭️ ${s.overgeslagen}` : "",
    s.snelste !== null ? `⚡ ${s.snelste} s` : "", `👟 ${getal(s.km)} km`,
    s.itemsIngezet ? `🎁 ${s.itemsIngezet}` : "", s.geraakt ? `🎯 ${s.geraakt}×` : "",
  ].filter(Boolean).join(" · ");
}

export async function uitslagTekst(admin: AdminClient, routeId: string): Promise<string> {
  return (await uitslagGegevens(admin, routeId)).tekst;
}

// De tekst én de gegevens voor het plaatje (🖼️ Uitslag en cijfers delen, alleen de spelleider)
export async function uitslagGegevens(admin: AdminClient, routeId: string) {
  const [{ data: route }, stand, stats] = await Promise.all([
    admin.from("routes").select("*").eq("id", routeId).maybeSingle(),
    maakStand(admin, routeId, "", true),
    spelStatistieken(admin, routeId, ""),
  ]);
  const datum = new Date().toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Amsterdam" });
  const medaille = (r: number) => (r === 1 ? "🥇" : r === 2 ? "🥈" : r === 3 ? "🥉" : `${r}.`);
  const regels: string[] = [`🏆 *Uitslag ${route?.name ?? "PointRush"}*`, datum, ""];
  for (const e of stand) {
    regels.push(`${medaille(e.rank)} *${e.display_name}* · ${e.score} pt${e.prijs ? ` · ${e.prijs.emoji} ${e.prijs.titel}` : ""}`);
  }
  // Per team de cijfers, in de volgorde van de stand
  const metCijfers = stand.map((e) => ({ naam: e.display_name, stat: stats.perTeam.find((t) => t.naam === e.display_name)?.stat })).filter((x) => x.stat);
  if (metCijfers.length) {
    regels.push("", "📊 *In cijfers*");
    for (const t of metCijfers) regels.push(`*${t.naam}*: ${cijferRegel(t.stat!)}`);
  }
  if (stats.records.length) {
    regels.push("", "🏅 *Records*");
    for (const r of stats.records) regels.push(`${r.emoji} ${r.titel}: *${r.team}* (${r.waarde})`);
  }
  regels.push("", "Gespeeld met PointRush 🚀");
  return {
    tekst: regels.join("\n"),
    route: (route?.name as string | undefined) ?? "PointRush",
    huis_logo: huisLogoUrl(route),
    stand: stand.map((e) => ({ rank: e.rank, display_name: e.display_name, icon: e.icon, foto: e.foto ?? null, score: e.score, prijs: e.prijs ? { emoji: e.prijs.emoji, titel: e.prijs.titel } : null })),
    perTeam: stats.perTeam.map((t) => ({ naam: t.naam, stat: t.stat })),
    records: stats.records,
  };
}
