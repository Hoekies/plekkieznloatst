import { createServerSupabaseClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import AudioUnlock from "@/components/speler/AudioUnlock";
import IOSFixes from "@/components/speler/IOSFixes";

export default async function SpelerLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (user.user_metadata?.rol === "admin") redirect("/admin");

  return (
    <div className="speler-shell">
      <AudioUnlock />
      <IOSFixes />
      <header className="speler-header" style={{ position: "relative" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-breed.png" alt="PointRush" style={{
          height: "auto", width: "clamp(120px, 30vw, 200px)", objectFit: "contain",
          position: "absolute", left: "50%", transform: "translateX(-50%)",
        }} />
        <div style={{ flex: 1 }} />
        <form action="/api/auth/uitloggen" method="post">
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
