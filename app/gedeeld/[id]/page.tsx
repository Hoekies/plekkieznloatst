import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase-admin";
import { haalRouteVerslag } from "@/lib/team-verslag";
import { geldigeSleutel } from "@/lib/deel-link";
import GelopenRoute from "@/components/speler/GelopenRoute";

type Props = { params: { id: string }; searchParams: { k?: string } };

async function haalGegevens(id: string, k: string | undefined) {
  if (!/^[0-9a-f-]{36}$/i.test(id) || !geldigeSleutel(id, k)) return null;
  const admin = createAdminClient();
  const { data: sessie } = await admin
    .from("player_sessions")
    .select("id, route_id, players!inner(login_name, nickname), routes(name, is_active, uitslag_vrijgegeven)")
    .eq("id", id)
    .maybeSingle();
  if (!sessie) return null;
  const speler = sessie.players as unknown as { login_name: string; nickname: string | null };
  const route = sessie.routes as unknown as { name: string; is_active: boolean; uitslag_vrijgegeven: boolean } | null;
  return { sessie, team: speler.nickname ?? speler.login_name, route };
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const g = await haalGegevens(params.id, searchParams.k);
  const titel = g ? `Gelopen route van ${g.team} — PointRush` : "PointRush";
  return { title: titel, openGraph: { title: titel, description: g?.route?.name ?? "", images: ["/og-image.jpg"] }, robots: { index: false } };
}

// Openbare kaart van de gelopen route van één team, via de link uit WhatsApp (geen login nodig)
export default async function GedeeldeRoute({ params, searchParams }: Props) {
  const g = await haalGegevens(params.id, searchParams.k);
  if (!g) notFound();

  const verslag = await haalRouteVerslag(createAdminClient(), g.sessie.id);
  // Antwoorden pas tonen als de uitslag bekend is (of het spel voorbij): anders zou een team
  // dat nog speelt via deze link de antwoorden kunnen zien
  const antwoordenZichtbaar = !g.route || g.route.uitslag_vrijgegeven || !g.route.is_active;
  const punten = antwoordenZichtbaar ? verslag.punten : verslag.punten.map((p) => ({ ...p, antwoord: null, goed: null }));

  return (
    <GelopenRoute
      titel={`Gelopen route van ${g.team}`}
      ondertitel={g.route?.name}
      spoor={verslag.spoor}
      punten={punten}
      items={verslag.items.filter((i) => i.lat != null && i.lng != null).map((i) => ({ soort: i.soort, type: i.type, ander: i.ander, lat: i.lat!, lng: i.lng! }))}
      afstandM={verslag.afstandM}
    />
  );
}
