"use client";

import { useEffect, useRef, useState } from "react";

// 💬 Een chatgesprek tussen een team en de spelleider (spelplezier deel 2): gedeeld door de spelersapp (ChatKnop)
// en het beheer (ChatVenster). "ik" bepaalt welke kant rechts staat.
export type ChatBericht = { id: string; van: "team" | "leider"; tekst: string; created_at: string };

export default function ChatGesprek({ berichten, ik, onStuur, leeg }: {
  berichten: ChatBericht[];
  ik: "team" | "leider";
  onStuur: (tekst: string) => Promise<boolean>;
  leeg: string;
}) {
  const [tekst, setTekst] = useState("");
  const [bezig, setBezig] = useState(false);
  const lijstRef = useRef<HTMLDivElement>(null);
  // Altijd het nieuwste bericht in beeld
  useEffect(() => { lijstRef.current?.scrollTo({ top: lijstRef.current.scrollHeight }); }, [berichten.length]);

  async function stuur() {
    const t = tekst.trim();
    if (!t) return;
    setBezig(true);
    if (await onStuur(t)) setTekst("");
    setBezig(false);
  }
  const tijd = (iso: string) => new Date(iso).toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="chat">
      <div className="chat-lijst" ref={lijstRef}>
        {berichten.length === 0 && <div className="chat-leeg">{leeg}</div>}
        {berichten.map((b) => (
          <div key={b.id} className={`chat-bericht${b.van === ik ? " chat-bericht--ik" : ""}`}>
            <span>{b.tekst}</span>
            <small>{tijd(b.created_at)}</small>
          </div>
        ))}
      </div>
      <form className="chat-invoer" onSubmit={(e) => { e.preventDefault(); stuur(); }}>
        <input className="form-input" value={tekst} maxLength={300} onChange={(e) => setTekst(e.target.value)} placeholder="Typ een bericht…" />
        <button type="submit" className="rl-knop rl-knop--cyan" disabled={bezig || !tekst.trim()} aria-label="Versturen">➤</button>
      </form>
    </div>
  );
}
