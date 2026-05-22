import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import UitlogKnop from "@/components/admin/UitlogKnop";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.user_metadata?.rol !== "admin") redirect("/login");

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-logo" style={{ padding: "16px 20px" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Plekkie z'n Loatst" style={{ width: "100%", maxWidth: 180, objectFit: "contain" }} />
        </div>
        <nav className="admin-nav">
          <Link className="admin-nav-link" href="/admin">🏠 Dashboard</Link>
          <Link className="admin-nav-link" href="/admin/routes">🗺️ Routes</Link>
          <Link className="admin-nav-link" href="/admin/groepen">👥 Groepen</Link>
          <Link className="admin-nav-link" href="/admin/live">📡 Live kaart</Link>
        </nav>
        <div style={{ padding: "16px 20px", borderTop: "1px solid rgba(255,255,255,0.1)" }}>
          <UitlogKnop />
        </div>
      </aside>
      <div className="admin-main">
        {children}
      </div>
    </div>
  );
}
