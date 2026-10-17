import { haalGebruiker } from "@/lib/auth-server";
import { redirect } from "next/navigation";
import UitlogKnop from "@/components/admin/UitlogKnop";
import AdminNavLink from "@/components/admin/AdminNavLink";
import SidebarActies from "@/components/admin/SidebarActies";
import BroadcastKnop from "@/components/admin/BroadcastKnop";
import SidebarToggle from "@/components/admin/SidebarToggle";
import HulpMeldingen from "@/components/admin/HulpMeldingen";
import MeldingHouder from "@/components/admin/Melding";
import InfoKnop from "@/components/admin/InfoKnop";
import TussenstandKnop from "@/components/admin/TussenstandKnop";
import ActieveRouteLabel from "@/components/admin/ActieveRouteLabel";
import WhatsAppKnop from "@/components/admin/WhatsAppKnop";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await haalGebruiker();
  if (!user || user.app_metadata?.rol !== "admin") redirect("/login");

  return (
    <div className="admin-shell">
      <div className="admin-mobile-topbar">
        <SidebarToggle />
        {/* Breed logo in de bovenbalk van de telefoon */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-breed-strak.webp" alt="PointRush" className="admin-mobiel-logo" />
        {/* Bericht sturen en uitloggen als icoon; de rest staat in het menu */}
        <div style={{ display: "flex", gap: 8 }}>
          <BroadcastKnop alsIcoon />
          <UitlogKnop />
        </div>
      </div>
      <aside className="admin-sidebar">
        <div className="admin-sidebar-logo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.webp" alt="PointRush" style={{ width: "90%", objectFit: "contain", display: "block", margin: "0 auto", filter: "drop-shadow(0 6px 14px rgba(0,0,0,0.5)) drop-shadow(0 0 18px rgba(255,217,59,0.2))" }} />
        </div>
        {/* Bovenin het menu welke route er loopt */}
        <ActieveRouteLabel />
        <nav className="admin-nav">
          <AdminNavLink href="/admin" exact><span aria-hidden>🏠</span> Dashboard</AdminNavLink>
          <AdminNavLink href="/admin/groepen"><span aria-hidden>👥</span> Spelers</AdminNavLink>
          <AdminNavLink href="/admin/antwoorden"><span aria-hidden>📝</span> Antwoorden</AdminNavLink>
          <AdminNavLink href="/admin/live"><span aria-hidden>📡</span> Live kaart</AdminNavLink>
          <AdminNavLink href="/admin/routes"><span aria-hidden>🗺️</span> Routes</AdminNavLink>
        </nav>
        {/* Acties tijdens het spel: op pc en telefoon hetzelfde */}
        <div className="admin-menu-blok">
          <div className="admin-menu-kop">Spel</div>
          <div className="admin-menu-lijst">
            <TussenstandKnop alsMenu />
            <WhatsAppKnop alsMenu />
          </div>
        </div>
        <div className="admin-menu-blok admin-menu-blok--beheer">
          <div className="admin-menu-kop">Beheer</div>
          <SidebarActies />
        </div>
        <div className="admin-menu-blok admin-menu-blok--info">
          <InfoKnop />
        </div>
      </aside>
      <div className="admin-main">
        {children}
      </div>
      {/* Uitloggen altijd rechtsboven (op een groot scherm) */}
      <div className="admin-uitlog-hoek">
        <BroadcastKnop alsIcoon />
        <UitlogKnop compact />
      </div>
      <HulpMeldingen />
      <MeldingHouder />
    </div>
  );
}
