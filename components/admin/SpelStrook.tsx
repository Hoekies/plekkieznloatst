"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useBeheerStatus, verversBeheerStatus } from "@/components/admin/useBeheerStatus";
import { stuurPauze } from "@/components/admin/SpelLeider";
import EindtijdKnop, { resterend } from "@/components/admin/EindtijdKnop";
import TussenstandKnop from "@/components/admin/TussenstandKnop";
import BevestigKnop from "@/components/admin/BevestigKnop";
import { openFotoKeuren } from "@/components/admin/FotoKeuren";
import Icoon from "@/components/admin/Icoon";

// 🎯 Spelstrook: tijdens een spel onderaan elke beheerpagina (behalve het dashboard, daar staat de
// Spelleider, en de route-editor, daar zit de kaart): hoeveel teams onderweg, de resterende tijd, open
// hulpvragen en foto's om te keuren, en pauze. Zo hoef je niet steeds terug naar het dashboard.
export default function SpelStrook({ beperkt = false }: { beperkt?: boolean }) {
  const pad = usePathname();
  const { hulp, live } = useBeheerStatus();
  const [nu, setNu] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setNu(Date.now()), 30000); return () => clearInterval(t); }, []);

  const onderweg = live?.spelers.filter((s) => s.sessie_status === "actief").length ?? 0;
  if (!live?.route || onderweg === 0 || pad === "/admin" || /^\/admin\/routes\/[^/]+/.test(pad)) return null;
  const fotos = live.wachtende_fotos ?? 0;
  const eindtijd = live.route.eindtijd && new Date(live.route.eindtijd).getTime() > nu ? live.route.eindtijd : null;
  const pauze = !!live.route.gepauzeerd_sinds;
  const zetPauze = async (aan: boolean) => { if ((await stuurPauze(aan)) !== undefined) verversBeheerStatus(); };

  return (
    <div className="spelstrook" role="status">
      <span className="spelstrook-label"><i className={`spelstrook-dot${pauze ? " spelstrook-dot--pauze" : ""}`} aria-hidden /><span className="alleen-pc">{pauze ? "Gepauzeerd" : "Spel bezig"}</span></span>
      <span className="spelstrook-chip" title="Teams onderweg"><Icoon naam="doel" /> <strong>{onderweg}</strong><span className="alleen-pc"> onderweg</span></span>
      {/* Eindtijd: tik om te wijzigen (helpers zien alleen de resterende tijd) */}
      {beperkt
        ? eindtijd && <span className="spelstrook-chip"><Icoon naam="alarm" /> <span className="alleen-pc">nog </span><strong>{resterend(eindtijd, nu)}</strong></span>
        : <EindtijdKnop routeId={live.route.id} eindtijd={live.route.eindtijd} strook />}
      {hulp.length > 0 && <Link href="/admin" className="spelstrook-let spelstrook-let--hulp"><Icoon naam="waarschuwing" /> {hulp.length}<span className="alleen-pc"> {hulp.length === 1 ? "hulpvraag" : "hulpvragen"}</span></Link>}
      {fotos > 0 && <button type="button" onClick={openFotoKeuren} className="spelstrook-let"><Icoon naam="camera" /> {fotos}<span className="alleen-pc"> foto{fotos === 1 ? "" : "'s"} te keuren</span></button>}
      <span style={{ flex: 1 }} />
      {!beperkt && !pauze && <span className="alleen-pc-blok"><TussenstandKnop /></span>}
      {!beperkt && (pauze
        ? <button type="button" className="rl-knop rl-knop--groen" onClick={() => zetPauze(false)} data-sneltoets="p" title="Verder (sneltoets P)" aria-label="Verder"><Icoon naam="verder" /><span className="alleen-pc"> Verder</span></button>
        : <BevestigKnop venster gevaarlijk={false} icoon="⏸️" titel="Spel pauzeren?" sneltoets="p" title="Pauze (sneltoets P)"
            vraag="Alle teams zien een pauzescherm en kunnen even niets doen. De eindtijd loopt niet door." ja="Ja, pauzeren"
            onBevestig={() => zetPauze(true)} className="rl-knop" aria-label="Pauze"><Icoon naam="pauze" /><span className="alleen-pc"> Pauze</span></BevestigKnop>)}
      <Link href="/admin" className="rl-knop" title="Naar het dashboard" aria-label="Dashboard"><Icoon naam="thuis" /><span className="alleen-pc"> Dashboard</span></Link>
    </div>
  );
}
