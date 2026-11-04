import { createAdminClient } from "@/lib/supabase-admin";
import { themaInlogScript } from "@/lib/kleurthema";
import { confettiInstelling } from "@/lib/huisstijl";
import ConfettiThema from "@/components/speler/ConfettiThema";

// Per bezoek de kleur van de actieve route (anders blijft die staan op het moment van bouwen)
export const dynamic = "force-dynamic";

// 🎨 Het inlogscherm in de gekozen kleur, vóór het tekenen (geen paarse flits), en de confetti in het seizoensthema
export default async function LoginLayout({ children }: { children: React.ReactNode }) {
  const admin = createAdminClient();
  const [{ data }, confetti] = await Promise.all([admin.from("routes").select("huis_thema").eq("is_active", true).maybeSingle(), confettiInstelling(admin)]);
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: themaInlogScript((data as { huis_thema?: string | null } | null)?.huis_thema) }} />
      {/* 🎉 "Ga spelen!": confetti in het thema van nu */}
      <ConfettiThema sleutel={confetti.sleutel} emoji={confetti.emoji} />
      {children}
    </>
  );
}
