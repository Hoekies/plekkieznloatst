"use client";

import { useState } from "react";
import WhatsAppVenster from "@/components/admin/WhatsAppVenster";
import WhatsAppLogo from "@/components/admin/WhatsAppLogo";

// Groene knop "WhatsApp": opent eerst het venster "Wat verstuur je?" (inloggegevens, uitleg).
// Staat waar je hem nodig hebt: op de spelerspagina en bij de stap "Inloggegevens verstuurd" op het dashboard.
// tekst = andere tekst op de knop (bijv. "Versturen")
export default function WhatsAppKnop({ tekst = "WhatsApp" }: { tekst?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="wa-knop actie-knop"
        title="Inloggegevens en uitleg versturen via WhatsApp">
        <WhatsAppLogo maat={20} />
        {tekst}
      </button>
      {open && <WhatsAppVenster onSluit={() => setOpen(false)} />}
    </>
  );
}
