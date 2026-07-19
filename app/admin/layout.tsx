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
  if (!user || user.app_metadata?.rol !== "admin") redirect("/login");

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
          <img src="/logo.png" alt="PointRush" style={{ width: "90%", objectFit: "contain", display: "block", margin: "0 auto", filter: "drop-shadow(0 6px 14px rgba(0,0,0,0.5)) drop-shadow(0 0 18px rgba(255,217,59,0.2))" }} />
        </div>
        <nav className="admin-nav">
          <AdminNavLink href="/admin" exact><span aria-hidden>🏠</span> Dashboard</AdminNavLink>
          <AdminNavLink href="/admin/routes"><span aria-hidden>🗺️</span> Routes</AdminNavLink>
          <AdminNavLink href="/admin/groepen"><span aria-hidden>👥</span> Groepen</AdminNavLink>
          <AdminNavLink href="/admin/leaderboard"><span aria-hidden>🏆</span> Leaderboard</AdminNavLink>
          <AdminNavLink href="/admin/live"><span aria-hidden>📡</span> Live kaart</AdminNavLink>
          <BroadcastKnop />
        </nav>
        <div style={{ padding: "6px 10px", borderTop: "1px solid rgba(255,255,255,0.1)" }}>
          <div style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Beheer</div>
          <SidebarActies />
        </div>
        <div style={{ padding: "0 10px 6px", borderTop: "1px solid rgba(255,255,255,0.1)" }}>
          <UitlogKnop />
        </div>
      </aside>
      <div className="admin-main">
        {children}
      </div>
    </div>
  );
}
