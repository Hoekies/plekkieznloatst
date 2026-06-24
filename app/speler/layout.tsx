import { createServerSupabaseClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import AudioUnlock from "@/components/speler/AudioUnlock";
import IOSFixes from "@/components/speler/IOSFixes";
import DeviceGuard from "@/components/speler/DeviceGuard";

export default async function SpelerLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (user.user_metadata?.rol === "admin") redirect("/admin");

  return (
    <div className="speler-shell">
      <AudioUnlock />
      <IOSFixes />
      <DeviceGuard />
      <header className="speler-header">
        <div />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-breed.png" alt="PointRush" style={{
          height: "auto", width: "clamp(168px, 42vw, 280px)", objectFit: "contain", display: "block",
        }} />
        <form action="/api/auth/uitloggen" method="post" style={{ justifySelf: "end" }}>
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
