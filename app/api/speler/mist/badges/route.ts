import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import {
  PLAATS_TIERS, ALGEMENE_BADGES, STERRENJAGER_DREMPEL, VOLHOUDER_MINUTEN,
  cellenNaarHectare,
} from "@/lib/mist-badges";

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ fout: "Geen toegang" }, { status: 403 });

  const admin = createAdminClient();

  const { data: speler } = await admin
    .from("players").select("id").eq("auth_user_id", user.id).maybeSingle();
  if (!speler) return NextResponse.json({ fout: "Geen speler" }, { status: 403 });

  const { data: sessie } = await admin
    .from("player_sessions")
    .select("id, score, started_at")
    .eq("player_id", speler.id)
    .eq("status", "actief")
    .maybeSingle();
  if (!sessie) return NextResponse.json({ fout: "Geen actieve sessie" }, { status: 403 });

  const [{ data: behaald }, { data: plaatsVoortgang }] = await Promise.all([
    admin.from("mist_badges").select("code, plaats, behaald_op").eq("session_id", sessie.id),
    admin.from("mist_plaats_voortgang").select("plaats, cellen").eq("session_id", sessie.id),
  ]);

  const behaaldSet = new Set((behaald ?? []).map((b) => `${b.code}|${b.plaats}`));

  // Per plaats: hectares + welke tiers behaald zijn en wat de volgende drempel is.
  const plaatsen = (plaatsVoortgang ?? [])
    .map((p) => {
      const ha = cellenNaarHectare(p.cellen);
      const volgende = PLAATS_TIERS.find((t) => ha < t.ha) ?? null;
      return {
        plaats: p.plaats,
        ha,
        tiers: PLAATS_TIERS.map((t) => ({
          code: t.code,
          emoji: t.emoji,
          titel: `${t.titel} van ${p.plaats}`,
          ha: t.ha,
          behaald: behaaldSet.has(`${t.code}|${p.plaats}`),
        })),
        volgende: volgende ? { titel: `${volgende.titel} van ${p.plaats}`, ha: volgende.ha, nogHa: volgende.ha - ha } : null,
      };
    })
    .sort((a, b) => b.ha - a.ha);

  const minutenOnderweg = (Date.now() - new Date(sessie.started_at).getTime()) / 60000;
  const algemeen = ALGEMENE_BADGES.map((b) => {
    let voortgang: string | null = null;
    if (b.code === "sterrenjager" && sessie.score < STERRENJAGER_DREMPEL) {
      voortgang = `${sessie.score} / ${STERRENJAGER_DREMPEL} sterren`;
    } else if (b.code === "volhouder" && minutenOnderweg < VOLHOUDER_MINUTEN) {
      voortgang = `${Math.floor(minutenOnderweg)} / ${VOLHOUDER_MINUTEN} minuten`;
    } else if (b.code === "grensganger" && plaatsen.length < 2) {
      voortgang = `${plaatsen.length} / 2 plaatsen`;
    }
    return { ...b, behaald: behaaldSet.has(`${b.code}|`), voortgang };
  });

  return NextResponse.json({
    plaatsen,
    algemeen,
    aantalBehaald: behaald?.length ?? 0,
  });
}
