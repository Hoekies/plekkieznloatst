"use client";

import { useBeheerStatus } from "@/components/admin/useBeheerStatus";
import { openFotoKeuren } from "@/components/admin/FotoKeuren";
import Icoon from "@/components/admin/Icoon";

// 📸 Kopknop op het dashboard: opent het keurvenster (FotoKeuren), met het aantal foto's dat wacht
export default function FotoBeoordelingPanel() {
  const aantal = useBeheerStatus().live?.wachtende_fotos ?? 0;
  return (
    <button className="btn btn-outline header-knop" style={{ position: "relative" }} onClick={openFotoKeuren} title="Foto's keuren">
      <Icoon naam="camera" /> Foto&apos;s<span className="alleen-pc"> beoordelen</span>
      {aantal > 0 && <span className="header-knop-teller">{aantal}</span>}
    </button>
  );
}
