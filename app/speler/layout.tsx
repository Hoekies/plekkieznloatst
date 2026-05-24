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
      <header className="speler-header">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="Plekkie z'n Loatst" style={{ height: 72, width: "auto", objectFit: "contain", flexShrink: 0 }} />
        <form action="/api/auth/uitloggen" method="post">
          <button type="submit" className="speler-uitlog-btn">
            Uitloggen
          </button>
        </form>
      </header>
      <main className="speler-content">
        {children}
      </main>
      <footer style={{ textAlign: "right", padding: "8px 16px", fontSize: "0.68rem", color: "rgba(255,255,255,0.25)", flexShrink: 0 }}>
        Hoekies 2026
      </footer>
    </div>
  );
}
