import { createServerSupabaseClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import UitlogKnop from "@/components/admin/UitlogKnop";
import AdminNavLink from "@/components/admin/AdminNavLink";
import SidebarActies from "@/components/admin/SidebarActies";
import BroadcastKnop from "@/components/admin/BroadcastKnop";
import SidebarToggle from "@/components/admin/SidebarToggle";

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
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <AdminNavLink href="/admin" exact><img src="/help/dashboard.png" alt="Dashboard" style={{ height: 24, width: "auto", borderRadius: 6, display: "block" }} /></AdminNavLink>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <AdminNavLink href="/admin/routes"><img src="/help/routes.png" alt="Routes" style={{ height: 24, width: "auto", borderRadius: 6, display: "block" }} /></AdminNavLink>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <AdminNavLink href="/admin/groepen"><img src="/help/groepen.png" alt="Groepen" style={{ height: 24, width: "auto", borderRadius: 6, display: "block" }} /></AdminNavLink>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <AdminNavLink href="/admin/leaderboard"><img src="/help/leaderboard.png" alt="Leaderboard" style={{ height: 24, width: "auto", borderRadius: 6, display: "block" }} /></AdminNavLink>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <AdminNavLink href="/admin/live"><img src="/help/live kaart.png" alt="Live kaart" style={{ height: 24, width: "auto", borderRadius: 6, display: "block" }} /></AdminNavLink>
          <BroadcastKnop />
        </nav>
        <div style={{ padding: "12px 14px", borderTop: "1px solid rgba(255,255,255,0.1)" }}>
          <div style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>Beheer</div>
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
        <footer style={{ textAlign: "right", padding: "8px 24px", fontSize: "0.68rem", color: "rgba(255,255,255,0.3)", borderTop: "1px solid rgba(255,255,255,0.1)", flexShrink: 0 }}>
          Hoekies 2026
        </footer>
      </div>
    </div>
  );
}
