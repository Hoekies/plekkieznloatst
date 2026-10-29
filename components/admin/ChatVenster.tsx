"use client";

import { useCallback, useEffect, useState } from "react";
import { VensterMetKop } from "@/components/shared/Venster";
import ChatGesprek, { type ChatBericht } from "@/components/shared/ChatGesprek";
import { toonMelding } from "@/components/admin/Melding";

// 💬 Chat met één team voor de spelleider (spelplezier deel 2). Openen markeert de berichten van het team als gelezen.
export default function ChatVenster({ sessieId, naam, icoon, onSluit }: { sessieId: string; naam: string; icoon?: string | null; onSluit: () => void }) {
  const [berichten, setBerichten] = useState<ChatBericht[]>([]);
  const laad = useCallback(async () => {
    const res = await fetch(`/api/admin/chat?sessie_id=${sessieId}`, { cache: "no-store" }).catch(() => null);
    const d = res ? await res.json().catch(() => ({})) : {};
    if (!res?.ok) { toonMelding(d.fout ?? "Laden lukte niet", "fout"); return; }
    setBerichten(d.berichten ?? []);
  }, [sessieId]);
  useEffect(() => { laad(); const t = setInterval(laad, 4000); return () => clearInterval(t); }, [laad]);

  async function stuur(tekst: string) {
    const res = await fetch("/api/admin/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessie_id: sessieId, tekst }) }).catch(() => null);
    if (!res?.ok) { toonMelding("Versturen lukte niet", "fout"); return false; }
    await laad();
    return true;
  }

  return (
    <VensterMetKop icoon={icoon ?? "💬"} label="Chat" titel={naam} onSluit={onSluit} breedte={420} maxHoogte={80}>
      <ChatGesprek berichten={berichten} ik="leider" onStuur={stuur} leeg="Nog geen berichten. Typ hieronder om het team iets te sturen." />
    </VensterMetKop>
  );
}
