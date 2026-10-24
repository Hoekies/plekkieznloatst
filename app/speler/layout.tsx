import { haalGebruiker } from "@/lib/auth-server";
import { redirect } from "next/navigation";
import AudioUnlock from "@/components/speler/AudioUnlock";
import IOSFixes from "@/components/speler/IOSFixes";
import DeviceGuard from "@/components/speler/DeviceGuard";
import VolledigSchermKnop from "@/components/shared/VolledigSchermKnop";
import AutoVolledigScherm from "@/components/shared/AutoVolledigScherm";
import SpelerUitlog from "@/components/speler/SpelerUitlog";
import GeluidSetKiezen from "@/components/speler/GeluidSetKiezen";
import { createAdminClient } from "@/lib/supabase-admin";
import { haalHuisstijl } from "@/lib/huisstijl";

export default async function SpelerLayout({ children }: { children: React.ReactNode }) {
  const user = await haalGebruiker();
  if (!user) redirect("/login");
  if (user.app_metadata?.rol === "admin" || user.app_metadata?.rol === "helper") redirect("/admin");

  // 🎨 Huisstijl van de route: eigen accentkleur en logo in de bovenbalk
  const huisstijl = await haalHuisstijl(createAdminClient());
  const kleurVars = huisstijl.kleur
    ? ({ "--pr-orange": huisstijl.kleur, "--huis-kleur": huisstijl.kleur } as React.CSSProperties)
    : undefined;

  return (
    <div className={`speler-shell${huisstijl.kleur ? " speler-shell--huisstijl" : ""}${huisstijl.logo ? " speler-shell--logo" : ""}`} style={kleurVars}>
      <GeluidSetKiezen set={huisstijl.geluidSet} />
      <AudioUnlock />
      <IOSFixes />
      <DeviceGuard />
      <AutoVolledigScherm />
      <header className="speler-header">
        <VolledigSchermKnop />
        {/* Logo zonder lege randen: vult de hoogte van de balk, links uitgelijnd */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/spellogo/breed.webp" alt="PointRush" className="speler-header-logo" />
        {/* Logo van de organisatie (huisstijl van de route) */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {huisstijl.logo && <img src={huisstijl.logo} alt="" className="speler-header-huislogo" />}
        <SpelerUitlog />
      </header>
      <main className="speler-content">
        {children}
      </main>
    </div>
  );
}
