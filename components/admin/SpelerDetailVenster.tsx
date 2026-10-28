"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import type { SpelerOverzicht } from "@/lib/admin-live";
import { sessietijd } from "@/lib/admin-live";
import type { RouteVerslag } from "@/lib/team-verslag";
import { formateerTijd } from "@/lib/geo";
import { itemNaam } from "@/components/speler/SpeciaalItemLegende";
import Venster, { vensterHoogte } from "@/components/shared/Venster";
import LaadBlokjes from "@/components/shared/LaadBlokjes";

const GelopenRouteKaart = dynamic(() => import("@/components/speler/GelopenRouteKaart"), { ssr: false });


// Alles van één speler in één venster: stand, gelopen route, antwoorden en items
export default function SpelerDetailVenster({ speler: s, rang, kleur, totaalPunten, onSluit, acties }: {
  speler: SpelerOverzicht; rang: number; kleur: string; totaalPunten: number; onSluit: () => void;
  // Knoppen (punt vrijgeven, punten, bericht, stoppen): dezelfde als op de spelerskaart
  acties?: React.ReactNode;
}) {
  const [verslag, setVerslag] = useState<RouteVerslag | null>(null);
  const [fout, setFout] = useState(false);

  useEffect(() => {
    if (!s.sessie_id) return;
    fetch(`/api/admin/sessies/${s.sessie_id}/verslag`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setVerslag)
      .catch(() => setFout(true));
  }, [s.sessie_id]);


  // Eén keer per verslag: anders bouwt het kaartje bij elke verversing van het dashboard opnieuw op
  const kaartItems = useMemo(() => (verslag?.items ?? []).filter((i) => i.lat != null && i.lng != null)
    .map((i) => ({ soort: i.soort, type: i.type, ander: i.ander, lat: i.lat!, lng: i.lng! })), [verslag]);
  const vragen = verslag?.punten.filter((p) => p.heeftVraag) ?? [];
  const goed = vragen.filter((p) => p.goed).length;

  return (
    <Venster onSluit={onSluit} breedte={640} maxHoogte={94} rand={12}>
        <div className="pr-gem-panel-inner detail-venster" style={{ display: "flex", flexDirection: "column", gap: 12, maxHeight: vensterHoogte(94, 6), overflowY: "auto", padding: "14px 16px 16px" }}>
          {/* Kop: wie, plek en score */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span className="pr-gem-avatar speler-ring" style={{ width: 46, height: 46, fontSize: "1.6rem", ["--speler-kleur" as string]: kleur }}>{s.icon ?? "👫"}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.1rem", color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {rang <= 3 ? ["🥇", "🥈", "🥉"][rang - 1] : `#${rang}`} {s.display_name}
              </div>
              <div style={{ fontSize: "0.78rem", color: "var(--muted)" }}>Login: {s.login_name} · {s.sessie_status === "voltooid" ? "🏁 gefinisht" : "onderweg"}</div>
            </div>
            <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.3rem", color: s.score < 0 ? "#FCA5A5" : "#FFE680", whiteSpace: "nowrap" }}>{s.score} pt</span>
            <button type="button" className="editor-paneel-sluit" onClick={onSluit} title="Sluiten">✕</button>
          </div>

          {acties && <div className="detail-acties">{acties}</div>}

          {/* Kerngetallen */}
          <div className="detail-cijfers">
            <div><span>⏱</span><strong>{s.started_at ? formateerTijd(sessietijd(s)) : "—"}</strong><small>speeltijd</small></div>
            <div><span>🚶</span><strong>{((verslag?.afstandM ?? s.afstand_m) / 1000).toFixed(2).replace(".", ",")} km</strong><small>gelopen</small></div>
            <div><span>📍</span><strong>{totaalPunten ? `${s.bezochte_punten}/${totaalPunten}` : s.bezochte_punten}</strong><small>punten</small></div>
            <div><span>✅</span><strong>{verslag ? `${goed}/${vragen.length}` : "…"}</strong><small>vragen goed</small></div>
          </div>

          {/* 🎒 Items: wat het team nog in de balk heeft en wat het al inzette */}
          {(s.items.in_balk.length > 0 || s.items.ingezet.length > 0) && (
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "6px 16px", fontSize: "0.8rem", color: "var(--muted)" }}>
              {s.items.in_balk.length > 0 && <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>🎒 In de balk: <ItemIcoontjes types={s.items.in_balk} /></span>}
              {s.items.ingezet.length > 0 && <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>Ingezet: <ItemIcoontjes types={s.items.ingezet} vaag /></span>}
            </div>
          )}

          {/* Gelopen route */}
          <div style={{ height: 330, borderRadius: 14, overflow: "hidden", flexShrink: 0 }}>
            {fout ? <p style={{ color: "var(--muted)", fontSize: "0.85rem" }}>Kon de gegevens niet laden.</p>
              : !verslag ? <LaadBlokjes aantal={1} hoogte={330} />
              : verslag.spoor.length < 2 && verslag.punten.length === 0 ? <p style={{ color: "var(--muted)", fontSize: "0.85rem" }}>Nog geen GPS-spoor.</p>
              : <GelopenRouteKaart scherp spoor={verslag.spoor} punten={verslag.punten} items={kaartItems} />}
          </div>

          {/* Antwoorden */}
          {verslag && verslag.punten.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div className="pr-gem-label">📝 Bezochte punten</div>
              {verslag.punten.map((p) => {
                const kl = p.goed === true ? "#4ADE80" : p.goed === false ? "#F87171" : p.heeftVraag ? "#FBBF24" : "rgba(255,255,255,0.25)";
                return (
                  <div key={p.nr} style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "8px 10px", borderRadius: 10, background: "rgba(255,255,255,0.04)", borderLeft: `3px solid ${kl}`, fontSize: "0.82rem" }}>
                    <span style={{ fontWeight: 800, color: "var(--muted)", width: 18 }}>{p.nr}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ color: "#fff", fontWeight: 700 }}>{p.naam}</div>
                      {p.heeftVraag && <div style={{ color: "var(--text)" }}>{p.vraag}</div>}
                      {p.heeftVraag && <div style={{ color: kl }}>{p.goed === true ? "✓" : p.goed === false ? "✗" : "⏳"} {p.antwoord ?? "nog niet beantwoord"}</div>}
                    </div>
                    {p.punten != null && <span style={{ fontWeight: 700, color: "var(--ink)" }}>+{p.punten}</span>}
                  </div>
                );
              })}
            </div>
          )}

          {/* Items */}
          {verslag && verslag.items.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div className="pr-gem-label">🎒 Items</div>
              {verslag.items.map((i, n) => (
                <div key={n} style={{ display: "flex", alignItems: "center", gap: 12, fontSize: "0.82rem", color: "var(--text)" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/items/${i.type}.webp`} alt="" style={{ width: 24, height: 24 }} />
                  <span style={{ flex: 1 }}>
                    {i.soort === "ingezet"
                      ? `${itemNaam(i.type)} ingezet${i.ander ? ` op ${i.ander}` : ""}`
                      : `${itemNaam(i.type)} gekregen${i.ander ? ` van ${i.ander}` : ""}`}
                  </span>
                  <span style={{ color: "var(--muted)", fontSize: "0.74rem" }}>{new Date(i.tijd).toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" })}</span>
                </div>
              ))}
            </div>
          )}
        </div>
    </Venster>
  );
}

// Item-icoontjes, gegroepeerd per type met een aantal (bv. 2× bom)
function ItemIcoontjes({ types, vaag = false }: { types: string[]; vaag?: boolean }) {
  const aantallen = new Map<string, number>();
  types.forEach((t) => aantallen.set(t, (aantallen.get(t) ?? 0) + 1));
  return (
    // Mag over meerdere regels: met veel items werd de kaart anders breder dan het scherm
    <span style={{ display: "inline-flex", alignItems: "center", gap: 3, flexWrap: "wrap", minWidth: 0 }}>
      {[...aantallen].map(([type, n]) => (
        <span key={type} title={`${itemNaam(type)}${n > 1 ? ` (${n}×)` : ""}`}
          style={{ display: "inline-flex", alignItems: "center", opacity: vaag ? 0.45 : 1 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/items/${type}.webp`} alt={itemNaam(type)} style={{ width: 22, height: 22 }} />
          {n > 1 && <span style={{ fontWeight: 700, color: "var(--ink)", marginLeft: 1 }}>{n}</span>}
        </span>
      ))}
    </span>
  );
}
