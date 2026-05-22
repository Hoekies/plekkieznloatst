import { createServerSupabaseClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";

export default async function SpelerLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (user.user_metadata?.rol === "admin") redirect("/admin");

  return (
    <div className="speler-shell">
      <header className="speler-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 16px" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="Plekkie z'n Loatst" style={{ height: 80, objectFit: "contain" }} />
        <form action="/api/auth/uitloggen" method="post">
          <button type="submit" style={{
            background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.4)",
            color: "#fff", fontSize: "0.82rem", cursor: "pointer",
            padding: "6px 14px", borderRadius: 6, fontWeight: 600,
          }}>
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
