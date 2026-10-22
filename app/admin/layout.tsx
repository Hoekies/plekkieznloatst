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
import ActieveRouteLabel from "@/components/admin/ActieveRouteLabel";
import PushMeldingenKnop from "@/components/admin/PushMeldingenKnop";
import VersieRegel from "@/components/admin/VersieRegel";
import MenuInklap from "@/components/admin/MenuInklap";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await haalGebruiker();
  const rol = user?.app_metadata?.rol;
  if (!user || (rol !== "admin" && rol !== "helper")) redirect("/login");
  // Helper: alleen het dashboard, antwoorden (foto's keuren) en de live kaart
  const helper = rol === "helper";

  return (
    <div className="admin-shell">
      <div className="admin-mobile-topbar">
        <SidebarToggle />
        {/* Breed logo in de bovenbalk van de telefoon */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-breed-strak.webp" alt="PointRush" className="admin-mobiel-logo" />
        {/* Bericht sturen en uitloggen als icoon; de rest staat in het menu */}
        <div style={{ display: "flex", gap: 8 }}>
          {!helper && <BroadcastKnop alsIcoon />}
          <UitlogKnop />
        </div>
      </div>
      <aside className="admin-sidebar">
        <div className="admin-sidebar-logo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.webp" alt="PointRush" style={{ width: "90%", objectFit: "contain", display: "block", margin: "0 auto", filter: "drop-shadow(0 6px 14px rgba(0,0,0,0.5)) drop-shadow(0 0 18px rgba(255,217,59,0.2))" }} />
        </div>
        {/* Bovenin het menu welke route er loopt */}
        {helper ? <div className="admin-menu-kop" style={{ textAlign: "center", marginBottom: 6 }}>🦺 Helper</div> : <ActieveRouteLabel />}
        <nav className="admin-nav">
          <AdminNavLink href="/admin" exact><span aria-hidden>🏠</span> Dashboard</AdminNavLink>
          {!helper && <AdminNavLink href="/admin/groepen"><span aria-hidden>👫</span> Spelers</AdminNavLink>}
          <AdminNavLink href="/admin/antwoorden"><span aria-hidden>📝</span> Antwoorden</AdminNavLink>
          <AdminNavLink href="/admin/live"><span aria-hidden>📡</span> Live kaart</AdminNavLink>
          {!helper && <AdminNavLink href="/admin/routes"><span aria-hidden>🗺️</span> Routes</AdminNavLink>}
        </nav>
        {/* Meldingen op dit toestel aan of uit (een instelling, geen actie: WhatsApp en tussenstand staan
            op de pagina's waar je ze gebruikt) */}
        <div className="admin-menu-blok">
          <div className="admin-menu-kop">Dit toestel</div>
          <div className="admin-menu-lijst">
            <PushMeldingenKnop />
          </div>
        </div>
        {!helper && (
          <div className="admin-menu-blok admin-menu-blok--beheer">
            <div className="admin-menu-kop">Beheer</div>
            <SidebarActies />
            <AdminNavLink href="/admin/systeem"><span aria-hidden>🩺</span> Systeemcheck</AdminNavLink>
          </div>
        )}
        <div className="admin-menu-blok admin-menu-blok--info">
          <InfoKnop />
          {/* Computer: menu inklappen tot een smalle balk met icoontjes */}
          <MenuInklap />
          {/* Versie en laatste update, klein onderaan */}
          <VersieRegel />
        </div>
      </aside>
      <div className="admin-main">
        {children}
      </div>
      {/* Uitloggen altijd rechtsboven (op een groot scherm) */}
      <div className="admin-uitlog-hoek">
        {!helper && <BroadcastKnop alsIcoon />}
        <UitlogKnop compact />
      </div>
      <HulpMeldingen />
      <MeldingHouder />
    </div>
  );
}
