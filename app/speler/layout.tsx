import { createServerSupabaseClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";

export default async function SpelerLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (user.user_metadata?.rol === "admin") redirect("/admin");

  return (
    <div className="speler-shell">
      <header className="speler-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h1>📍 Plekkie z&apos;n Loatst</h1>
        <form action="/api/auth/uitloggen" method="post">
          <button type="submit" style={{ background: "none", border: "none", color: "rgba(255,255,255,0.7)", fontSize: "0.8rem", cursor: "pointer", padding: "4px 8px" }}>
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
