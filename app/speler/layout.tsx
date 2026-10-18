import { haalGebruiker } from "@/lib/auth-server";
import { redirect } from "next/navigation";
import AudioUnlock from "@/components/speler/AudioUnlock";
import IOSFixes from "@/components/speler/IOSFixes";
import DeviceGuard from "@/components/speler/DeviceGuard";
import VolledigSchermKnop from "@/components/shared/VolledigSchermKnop";
import AutoVolledigScherm from "@/components/shared/AutoVolledigScherm";
import SchermAanHouden from "@/components/speler/SchermAanHouden";

export default async function SpelerLayout({ children }: { children: React.ReactNode }) {
  const user = await haalGebruiker();
  if (!user) redirect("/login");
  if (user.app_metadata?.rol === "admin" || user.app_metadata?.rol === "helper") redirect("/admin");

  return (
    <div className="speler-shell">
      <AudioUnlock />
      <IOSFixes />
      <DeviceGuard />
      <SchermAanHouden />
      <AutoVolledigScherm />
      <header className="speler-header">
        <VolledigSchermKnop />
        {/* Logo zonder lege randen: vult de hoogte van de balk, links uitgelijnd */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-breed-strak.webp" alt="PointRush" className="speler-header-logo" />
        <form action="/api/auth/uitloggen" method="post" style={{ flexShrink: 0 }}>
          <button type="submit" className="speler-uitlog-btn">
            Uitloggen
          </button>
        </form>
      </header>
      <main className="speler-content">
        {children}
      </main>
    </div>
  );
}
