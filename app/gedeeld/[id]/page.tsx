import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase-admin";
import { haalRouteVerslag } from "@/lib/team-verslag";
import { geldigeSleutel } from "@/lib/deel-link";
import GelopenRoute from "@/components/speler/GelopenRoute";
import { huisLogoUrl } from "@/lib/huisstijl";

type Props = { params: { id: string }; searchParams: { k?: string } };

async function haalGegevens(id: string, k: string | undefined) {
  if (!/^[0-9a-f-]{36}$/i.test(id) || !geldigeSleutel(id, k)) return null;
  const admin = createAdminClient();
  const { data: sessie } = await admin
    .from("player_sessions")
    .select("id, route_id, players!inner(login_name, nickname), routes(*)")
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
  // Spel opgeruimd (Reset spel), route verwijderd of een onvolledige link
  if (!g) return <NietBeschikbaar />;

  const verslag = await haalRouteVerslag(createAdminClient(), g.sessie.id);
  // Vragen en antwoorden pas tonen als de uitslag bekend is (of het spel voorbij): anders zou een team
  // dat nog speelt via deze link de antwoorden kunnen zien
  const antwoordenZichtbaar = !g.route || g.route.uitslag_vrijgegeven || !g.route.is_active;
  const punten = antwoordenZichtbaar ? verslag.punten : verslag.punten.map((p) => ({ ...p, vraag: null, antwoord: null, goed: null }));

  return (
    <GelopenRoute
      titel={`Gelopen route van ${g.team}`}
      ondertitel={g.route?.name}
      huisLogo={huisLogoUrl(g.route)}
      spoor={verslag.spoor}
      punten={punten}
      items={verslag.items.filter((i) => i.lat != null && i.lng != null).map((i) => ({ soort: i.soort, type: i.type, ander: i.ander, lat: i.lat!, lng: i.lng! }))}
      afstandM={verslag.afstandM}
    />
  );
}

// Eigen melding voor de kaart-link, in plaats van de algemene "pagina niet gevonden"
function NietBeschikbaar() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      gap: 14, padding: 24, textAlign: "center", background: "var(--game-gradient)", color: "#fff" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo.webp" alt="PointRush" style={{ width: 160, height: "auto" }} />
      <div style={{ fontSize: "3rem", lineHeight: 1 }}>🏁</div>
      <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 800 }}>Deze kaart is niet meer beschikbaar</h1>
      <p style={{ margin: 0, maxWidth: 360, fontSize: "1rem", lineHeight: 1.5, color: "rgba(255,255,255,0.8)" }}>
        Het spel is afgelopen en de organisatie heeft alles opgeruimd. Bedankt voor het spelen! 🍌
      </p>
    </div>
  );
}
