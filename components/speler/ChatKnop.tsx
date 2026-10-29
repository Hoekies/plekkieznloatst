"use client";

import { useCallback, useEffect, useState } from "react";
import ChatGesprek, { type ChatBericht } from "@/components/shared/ChatGesprek";
import { speelBonus } from "@/lib/sounds";

// 💬 Chat met de spelleider op de kaart (spelplezier deel 2, per route aan of uit): een knop rechts met het aantal
// nieuwe berichten, en een paneel met het gesprek.
export default function ChatKnop() {
  const [aan, setAan] = useState(false);
  const [open, setOpen] = useState(false);
  const [berichten, setBerichten] = useState<(ChatBericht & { gelezen_op: string | null })[]>([]);

  const laad = useCallback(async (gelezen: boolean) => {
    const res = await fetch(`/api/speler/chat${gelezen ? "?gelezen=1" : ""}`, { cache: "no-store" }).catch(() => null);
    const d = res?.ok ? await res.json().catch(() => null) : null;
    if (!d) return;
    setAan(!!d.aan);
    setBerichten((oud) => {
      // Nieuw bericht van de spelleider terwijl het paneel dicht is: even een geluid
      if (!gelezen && d.berichten.some((b: ChatBericht) => b.van === "leider" && !oud.some((o) => o.id === b.id)) && oud.length) speelBonus();
      return d.berichten;
    });
  }, []);
  useEffect(() => {
    laad(open);
    const t = setInterval(() => laad(open), open ? 4000 : 12000);
    return () => clearInterval(t);
  }, [laad, open]);

  if (!aan) return null;
  const nieuw = berichten.filter((b) => b.van === "leider" && !b.gelezen_op).length;

  async function stuur(tekst: string) {
    const res = await fetch("/api/speler/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tekst }) }).catch(() => null);
    if (!res?.ok) return false;
    await laad(true);
    return true;
  }

  return (
    <>
      <button type="button" className="chat-knop" onClick={() => setOpen(true)} aria-label="Chat met de spelleider" title="Chat met de spelleider">
        💬{nieuw > 0 && <span className="chat-knop-teller">{nieuw}</span>}
      </button>
      {open && (
        <div className="chat-paneel-achter" onClick={() => setOpen(false)}>
          <div className="chat-paneel" onClick={(e) => e.stopPropagation()}>
            <div className="chat-paneel-kop">
              <strong>💬 Spelleider</strong>
              <button type="button" className="editor-paneel-sluit" onClick={() => setOpen(false)} aria-label="Sluiten">✕</button>
            </div>
            <ChatGesprek berichten={berichten} ik="team" onStuur={stuur} leeg="Stel je vraag aan de spelleider. Je krijgt hier antwoord." />
          </div>
        </div>
      )}
    </>
  );
}
