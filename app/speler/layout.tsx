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
          height: 204, width: "auto", objectFit: "contain",
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
      <footer style={{ textAlign: "right", padding: "8px 16px", paddingBottom: "max(8px, env(safe-area-inset-bottom))", fontSize: "0.68rem", color: "rgba(255,255,255,0.25)", flexShrink: 0 }}>
        Hoekies 2026
      </footer>
    </div>
  );
}
