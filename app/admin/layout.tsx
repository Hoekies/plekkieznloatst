import { createServerSupabaseClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import UitlogKnop from "@/components/admin/UitlogKnop";
import AdminNavLink from "@/components/admin/AdminNavLink";
import SidebarActies from "@/components/admin/SidebarActies";
import BroadcastKnop from "@/components/admin/BroadcastKnop";
import SidebarToggle from "@/components/admin/SidebarToggle";
import AdminHelpKnop from "@/components/admin/AdminHelpKnop";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.user_metadata?.rol !== "admin") redirect("/login");

  return (
    <div className="admin-shell">
      <div className="admin-mobile-topbar">
        <SidebarToggle />
        <span style={{ fontWeight: 700, fontSize: "0.9rem", color: "#fff" }}>PointRush</span>
        <div style={{ width: 40 }} />
      </div>
      <aside className="admin-sidebar">
        <div className="admin-sidebar-logo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="PointRush" style={{ width: "50%", objectFit: "contain", display: "block", margin: "0 auto" }} />
        </div>
        <nav className="admin-nav">
          <AdminNavLink href="/admin" exact>🏠 Dashboard</AdminNavLink>
          <AdminNavLink href="/admin/routes">🗺️ Routes</AdminNavLink>
          <AdminNavLink href="/admin/groepen">👥 Groepen</AdminNavLink>
          <AdminNavLink href="/admin/leaderboard">🏆 Leaderboard</AdminNavLink>
          <AdminNavLink href="/admin/live">📡 Live kaart</AdminNavLink>
          <BroadcastKnop />
        </nav>
        <div style={{ padding: "12px 14px", borderTop: "1px solid rgba(255,255,255,0.1)" }}>
          <div style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>Beheer</div>
          <SidebarActies />
        </div>
        <div style={{ padding: "10px 14px", borderTop: "1px solid rgba(255,255,255,0.1)", display: "flex", flexDirection: "column", gap: 8 }}>
          <AdminHelpKnop />
          <UitlogKnop />
        </div>
        <div style={{ padding: "8px 14px", textAlign: "center" }}>
          <span style={{ fontSize: "0.62rem", color: "rgba(255,255,255,0.2)" }}>Hoekies 2026</span>
        </div>
      </aside>
      <div className="admin-main">
        {children}
        <footer style={{ textAlign: "right", padding: "8px 24px", fontSize: "0.68rem", color: "rgba(255,255,255,0.3)", borderTop: "1px solid rgba(255,255,255,0.1)", flexShrink: 0 }}>
          Hoekies 2026
        </footer>
      </div>
    </div>
  );
}
