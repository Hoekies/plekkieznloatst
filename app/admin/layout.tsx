import { createServerSupabaseClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import UitlogKnop from "@/components/admin/UitlogKnop";
import AdminNavLink from "@/components/admin/AdminNavLink";
import SidebarActies from "@/components/admin/SidebarActies";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.user_metadata?.rol !== "admin") redirect("/login");

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-logo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/apple-touch-icon.png" alt="" style={{ width: 40, height: 40, objectFit: "contain", marginBottom: 6 }} />
          <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "#fff", lineHeight: 1.2 }}>
            Plekkie z&apos;n Loatst
          </div>
        </div>
        <nav className="admin-nav">
          <AdminNavLink href="/admin" exact>🏠 Dashboard</AdminNavLink>
          <AdminNavLink href="/admin/routes">🗺️ Routes</AdminNavLink>
          <AdminNavLink href="/admin/groepen">👥 Groepen</AdminNavLink>
          <AdminNavLink href="/admin/leaderboard">🏆 Leaderboard</AdminNavLink>
          <AdminNavLink href="/admin/live">📡 Live kaart</AdminNavLink>
        </nav>
        <div style={{ padding: "12px 14px", borderTop: "1px solid rgba(255,255,255,0.1)" }}>
          <div style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Beheer</div>
          <SidebarActies />
        </div>
        <div style={{ padding: "10px 14px", borderTop: "1px solid rgba(255,255,255,0.1)" }}>
          <UitlogKnop />
        </div>
        <div style={{ padding: "8px 14px", textAlign: "center" }}>
          <span style={{ fontSize: "0.62rem", color: "rgba(255,255,255,0.2)" }}>Hoekies 2026</span>
        </div>
      </aside>
      <div className="admin-main">
        {children}
      </div>
    </div>
  );
}
