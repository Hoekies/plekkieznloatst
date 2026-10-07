import { createAdminClient } from "@/lib/supabase-admin";
import { haalAntwoorden } from "@/lib/admin-antwoorden";
import { haalRouteVerslag, type RouteVerslag } from "@/lib/team-verslag";
import RapportWeergave from "@/components/admin/RapportWeergave";

// Printbaar rapport (opslaan als PDF): eindstand, en per team de vragen, items en gelopen route
export default async function RapportPagina() {
  const admin = createAdminClient();
  const data = await haalAntwoorden(admin);

  const verslagen: Record<string, RouteVerslag> = {};
  const fotoUrls: Record<string, string> = {};
  for (const team of data.teams) {
    verslagen[team.sessie_id] = await haalRouteVerslag(admin, team.sessie_id);
    for (const r of team.rijen) {
      if (!r.foto_pad) continue;
      const { data: getekend } = await admin.storage.from("foto-inzendingen").createSignedUrl(r.foto_pad, 60 * 60 * 6);
      if (getekend?.signedUrl) fotoUrls[r.foto_pad] = getekend.signedUrl;
    }
  }

  return <RapportWeergave data={data} verslagen={verslagen} fotoUrls={fotoUrls} gemaaktOp={new Date().toISOString()} />;
}
