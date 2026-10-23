import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase-admin";
import { geldigeAlbumSleutel } from "@/lib/deel-link";
import FotoAlbum, { type AlbumFoto } from "@/components/shared/FotoAlbum";
import { huisLogoUrl } from "@/lib/huisstijl";

type Props = { params: { id: string }; searchParams: { k?: string } };

async function haalRoute(id: string, k: string | undefined) {
  if (!/^[0-9a-f-]{36}$/i.test(id) || !geldigeAlbumSleutel(id, k)) return null;
  const { data } = await createAdminClient().from("routes").select("*").eq("id", id).maybeSingle();
  return data;
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const route = await haalRoute(params.id, searchParams.k);
  const titel = route ? `Fotoalbum ${route.name} — PointRush` : "PointRush";
  return { title: titel, openGraph: { title: titel, images: ["/og-image.jpg"] }, robots: { index: false } };
}

// 📸 Openbaar fotoalbum van een route: alle ingestuurde foto's (behalve afgekeurde), met team en punt.
// Via de link van de organisatie (Rapport → Fotoalbum), zonder inloggen.
export default async function AlbumPagina({ params, searchParams }: Props) {
  const route = await haalRoute(params.id, searchParams.k);
  if (!route) return <FotoAlbum titel="Dit album is niet beschikbaar" fotos={[]} nietBeschikbaar />;

  const admin = createAdminClient();
  type Rij = { id: string; foto_pad: string; created_at: string; route_points: { name: string } | null; player_sessions: { players: { login_name: string; nickname: string | null; icon: string | null } } | null };
  const { data } = await admin
    .from("foto_inzendingen")
    .select("id, foto_pad, created_at, route_points!inner(name, route_id), player_sessions!inner(players!inner(login_name, nickname, icon))")
    .eq("route_points.route_id", route.id)
    .neq("status", "afgekeurd")
    .order("created_at", { ascending: true });
  const rijen = (data ?? []) as unknown as Rij[];

  // Tijdelijke links naar de foto's (de opslag zelf is niet openbaar)
  const { data: getekend } = rijen.length
    ? await admin.storage.from("foto-inzendingen").createSignedUrls(rijen.map((r) => r.foto_pad), 60 * 60 * 12)
    : { data: [] };
  const url = new Map((getekend ?? []).map((g) => [g.path, g.signedUrl]));
  const fotos: AlbumFoto[] = rijen.flatMap((r) => {
    const src = url.get(r.foto_pad);
    if (!src) return [];
    const p = r.player_sessions?.players;
    return [{ id: r.id, src, team: p ? p.nickname ?? p.login_name : "Een team", icoon: p?.icon ?? null, punt: r.route_points?.name ?? "" }];
  });
  return <FotoAlbum titel={route.name} fotos={fotos} huisLogo={huisLogoUrl(route)} />;
}
