"use client";

import { useState } from "react";
import WhatsAppVenster from "@/components/admin/WhatsAppVenster";

// Groene knop "Versturen via WhatsApp": opent eerst het venster "Wat verstuur je?".
// groot = even hoog als de knoppen in de bovenbalk (dashboard)
export default function WhatsAppKnop({ groot = false }: { groot?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={groot ? "header-knop" : "actie-knop"}
        style={{
          display: "flex", alignItems: "center", gap: groot ? 10 : 6,
          padding: groot ? "0 18px 0 14px" : "8px 14px", borderRadius: groot ? "var(--radius-md)" : 8, border: "none",
          background: "#25D366", color: "#fff",
          fontWeight: 700, fontSize: groot ? "0.86rem" : "0.85rem", cursor: "pointer",
        }}
        title="Inloggegevens en uitleg versturen via WhatsApp"
      >
        <svg width={groot ? 26 : 16} height={groot ? 26 : 16} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
      <path d="M12 0C5.373 0 0 5.373 0 12c0 2.124.558 4.121 1.535 5.856L.057 23.571a.75.75 0 0 0 .937.899l5.878-1.545A11.95 11.95 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75a9.705 9.705 0 0 1-4.95-1.355l-.355-.212-3.668.965.977-3.576-.231-.367A9.712 9.712 0 0 1 2.25 12C2.25 6.615 6.615 2.25 12 2.25S21.75 6.615 21.75 12 17.385 21.75 12 21.75z"/>
      </svg>
        Versturen
      </button>
      {open && <WhatsAppVenster onSluit={() => setOpen(false)} />}
    </>
  );
}
