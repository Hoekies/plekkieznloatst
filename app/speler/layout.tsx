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
import { haalHuisstijl, confettiInstelling } from "@/lib/huisstijl";
import ConfettiThema from "@/components/speler/ConfettiThema";
import { themaScript } from "@/lib/kleurthema";

export default async function SpelerLayout({ children }: { children: React.ReactNode }) {
  const user = await haalGebruiker();
  if (!user) redirect("/login");
  if (user.app_metadata?.rol === "admin" || user.app_metadata?.rol === "helper") redirect("/admin");

  // 🎨 Huisstijl van de route: eigen accentkleur en logo in de bovenbalk
  const admin = createAdminClient();
  const huisstijl = await haalHuisstijl(admin);
  // 🗓️ Confetti in het thema van het seizoen (of het vastgezette thema uit het beheer)
  const confetti = await confettiInstelling(admin);
  const kleurVars = huisstijl.kleur
    ? ({ "--pr-orange": huisstijl.kleur, "--huis-kleur": huisstijl.kleur } as React.CSSProperties)
    : undefined;

  return (
    <div className={`speler-shell${huisstijl.kleur ? " speler-shell--huisstijl" : ""}${huisstijl.logo ? " speler-shell--logo" : ""}`} style={kleurVars}>
      {/* 🎨 Kleurthema van de route (migratie 011), vóór het tekenen */}
      <script dangerouslySetInnerHTML={{ __html: themaScript(huisstijl.thema) }} />
      <GeluidSetKiezen set={huisstijl.geluidSet} />
      <ConfettiThema sleutel={confetti.sleutel} emoji={confetti.emoji} />
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
