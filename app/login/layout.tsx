import { createAdminClient } from "@/lib/supabase-admin";
import { themaInlogScript } from "@/lib/kleurthema";

// Per bezoek de kleur van de actieve route (anders blijft die staan op het moment van bouwen)
export const dynamic = "force-dynamic";

// 🎨 Het inlogscherm in de gekozen kleur, vóór het tekenen (geen paarse flits)
export default async function LoginLayout({ children }: { children: React.ReactNode }) {
  const { data } = await createAdminClient().from("routes").select("huis_thema").eq("is_active", true).maybeSingle();
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: themaInlogScript((data as { huis_thema?: string | null } | null)?.huis_thema) }} />
      {children}
    </>
  );
}
