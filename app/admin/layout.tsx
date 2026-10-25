import { haalGebruiker } from "@/lib/auth-server";
import { redirect } from "next/navigation";
import UitlogKnop from "@/components/admin/UitlogKnop";
import AdminNavLink from "@/components/admin/AdminNavLink";
import BroadcastKnop from "@/components/admin/BroadcastKnop";
import SidebarToggle from "@/components/admin/SidebarToggle";
import HulpMeldingen from "@/components/admin/HulpMeldingen";
import MeldingHouder from "@/components/admin/Melding";
import InfoKnop from "@/components/admin/InfoKnop";
import ActieveRouteLabel from "@/components/admin/ActieveRouteLabel";
import PushMeldingenKnop from "@/components/admin/PushMeldingenKnop";
import VersieRegel from "@/components/admin/VersieRegel";
import MenuInklap from "@/components/admin/MenuInklap";
import { createAdminClient } from "@/lib/supabase-admin";
import { haalHuisstijl } from "@/lib/huisstijl";
import HulpKolom from "@/components/admin/HulpKolom";
import TabTeller from "@/components/admin/TabTeller";
import Sneltoetsen from "@/components/admin/Sneltoetsen";
import SpelStrook from "@/components/admin/SpelStrook";
import MenuGroep from "@/components/admin/MenuGroep";
import FotoKeurVenster from "@/components/admin/FotoKeuren";
import SysteemTeller from "@/components/admin/SysteemTeller";
import MenuIcoon from "@/components/admin/MenuIcoon";
import PaginaTitel from "@/components/admin/PaginaTitel";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await haalGebruiker();
  const rol = user?.app_metadata?.rol;
  if (!user || (rol !== "admin" && rol !== "helper")) redirect("/login");
  // Helper: alleen het dashboard, antwoorden (foto's keuren) en de live kaart
  const helper = rol === "helper";
  // Eigen logo van de organisatie (huisstijl van de actieve route), onder het PointRush-logo
  const huisLogo = (await haalHuisstijl(createAdminClient())).logo;

  return (
    <div className="admin-shell">
      <div className="admin-mobile-topbar">
        <SidebarToggle />
        {/* Telefoon: de naam van de pagina in de bovenbalk (de eigen kopbalk met alleen een titel valt dan weg) */}
        <PaginaTitel />
        {/* Bericht sturen en uitloggen als icoon; de rest staat in het menu */}
        <div style={{ display: "flex", gap: 8 }}>
          {!helper && <BroadcastKnop alsIcoon />}
          <UitlogKnop />
        </div>
      </div>
      <aside className="admin-sidebar">
        <div className="admin-sidebar-logo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/spellogo/vierkant.webp" alt="PointRush" style={{ width: "90%", objectFit: "contain", display: "block", margin: "0 auto", filter: "drop-shadow(0 6px 14px rgba(0,0,0,0.5)) drop-shadow(0 0 18px rgba(255,217,59,0.2))" }} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {huisLogo && <img src={huisLogo} alt="" className="admin-sidebar-huislogo" />}
        </div>
        {/* Bovenin het menu welke route er loopt */}
        {helper ? <div className="admin-menu-kop" style={{ textAlign: "center", marginBottom: 6 }}>🦺 Helper</div> : <ActieveRouteLabel />}
        <nav className="admin-nav">
          <AdminNavLink href="/admin" exact><MenuIcoon naam="dashboard" /> Dashboard</AdminNavLink>
          {!helper && <AdminNavLink href="/admin/groepen"><MenuIcoon naam="spelers" /> Spelers</AdminNavLink>}
          <AdminNavLink href="/admin/antwoorden"><MenuIcoon naam="antwoorden" /> Antwoorden</AdminNavLink>
          <AdminNavLink href="/admin/live"><MenuIcoon naam="live" /> Live kaart</AdminNavLink>
          {!helper && <AdminNavLink href="/admin/routes"><MenuIcoon naam="routes" /> Routes</AdminNavLink>}
        </nav>
        {/* ⚙️ Instellingen: seizoenen, systeemcheck en de meldingen op dit toestel (helpers: alleen meldingen) */}
        <div className="admin-menu-blok">
          <MenuGroep icoon={<MenuIcoon naam="instellingen" />} teller={helper ? undefined : <SysteemTeller />} titel="Instellingen" paden={["/admin/seizoenen", "/admin/systeem"]}>
            {!helper && <AdminNavLink href="/admin/seizoenen"><MenuIcoon naam="seizoenen" /> Seizoenen</AdminNavLink>}
            {!helper && <AdminNavLink href="/admin/systeem"><MenuIcoon naam="systeem" /> Systeemcheck<SysteemTeller /></AdminNavLink>}
            <PushMeldingenKnop />
          </MenuGroep>
        </div>
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
        {/* 🎯 Tijdens een spel: onderaan elke pagina de stand, hulpvragen, foto's en pauze */}
        <SpelStrook beperkt={helper} />
      </div>
      {/* Uitloggen altijd rechtsboven (op een groot scherm) */}
      <div className="admin-uitlog-hoek">
        {/* ❓ Hulp bij deze pagina: kolom rechts (alleen pc; de hoek zelf staat alleen op de pc) */}
        <HulpKolom />
        {!helper && <BroadcastKnop alsIcoon />}
        <UitlogKnop compact />
      </div>
      <HulpMeldingen />
      {/* (n) in het tabblad bij open hulpvragen en foto's om te keuren */}
      <TabTeller />
      {/* ⌨️ ? = hulp, B = bericht, P = pauze */}
      <Sneltoetsen />
      <MeldingHouder />
      {/* 📸 Eén keurvenster voor het hele beheer */}
      <FotoKeurVenster />
    </div>
  );
}
