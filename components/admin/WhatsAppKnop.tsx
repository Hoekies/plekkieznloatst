"use client";

import { useState } from "react";
import WhatsAppVenster from "@/components/admin/WhatsAppVenster";
import WhatsAppLogo from "@/components/admin/WhatsAppLogo";

// Groene knop "Versturen via WhatsApp": opent eerst het venster "Wat verstuur je?".
// groot = even hoog als de knoppen in de bovenbalk; alsMenu = als regel in het zijmenu
export default function WhatsAppKnop({ groot = false, alsMenu = false }: { groot?: boolean; alsMenu?: boolean }) {
  const [open, setOpen] = useState(false);
  if (alsMenu) {
    return (
      <>
        <button type="button" className="admin-nav-link admin-nav-link--whatsapp" onClick={() => setOpen(true)}
          title="Inloggegevens en uitleg versturen via WhatsApp">
          <span aria-hidden><WhatsAppLogo maat={20} /></span> WhatsApp
        </button>
        {open && <WhatsAppVenster onSluit={() => setOpen(false)} />}
      </>
    );
  }
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={`wa-knop${groot ? " header-knop" : " actie-knop"}`}
        title="Inloggegevens en uitleg versturen via WhatsApp">
        <WhatsAppLogo maat={groot ? 24 : 20} />
        WhatsApp
      </button>
      {open && <WhatsAppVenster onSluit={() => setOpen(false)} />}
    </>
  );
}
