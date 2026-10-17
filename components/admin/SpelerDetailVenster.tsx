"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import dynamic from "next/dynamic";
import type { SpelerOverzicht } from "@/lib/admin-live";
import { sessietijd } from "@/lib/admin-live";
import type { RouteVerslag } from "@/lib/team-verslag";
import { formateerTijd } from "@/lib/geo";

const GelopenRouteKaart = dynamic(() => import("@/components/speler/GelopenRouteKaart"), { ssr: false });

const ITEM_NAAM: Record<string, string> = {
  ster: "Ster", verdubbeling: "Verdubbeling", radar: "Radar", bom: "Bom", spook: "Spook",
  dief: "Dief", banaan: "Banaan", wissel: "Wissel", vraagteken: "Vraagteken", plekzooi: "Plek zooi",
};

// Alles van één speler in één venster: stand, gelopen route, antwoorden en items
export default function SpelerDetailVenster({ speler: s, rang, kleur, totaalPunten, onSluit }: {
  speler: SpelerOverzicht; rang: number; kleur: string; totaalPunten: number; onSluit: () => void;
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

  useEffect(() => {
    const toets = (e: KeyboardEvent) => { if (e.key === "Escape") onSluit(); };
    window.addEventListener("keydown", toets);
    return () => window.removeEventListener("keydown", toets);
  }, [onSluit]);

  const vragen = verslag?.punten.filter((p) => p.heeftVraag) ?? [];
  const goed = vragen.filter((p) => p.goed).length;

  return createPortal(
    <div onClick={onSluit} style={{ position: "fixed", inset: 0, zIndex: 2500, background: "rgba(12,3,34,0.72)", display: "flex", alignItems: "center", justifyContent: "center", padding: 12 }}>
      <div onClick={(e) => e.stopPropagation()} className="pr-gem-panel" style={{ flex: "none", width: "100%", maxWidth: 640, maxHeight: "94vh" }}>
        <div className="pr-gem-panel-inner" style={{ display: "flex", flexDirection: "column", gap: 14, maxHeight: "calc(94vh - 6px)", overflowY: "auto", padding: "16px 16px 18px" }}>
          {/* Kop: wie, plek en score */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span className="pr-gem-avatar speler-ring" style={{ width: 56, height: 56, fontSize: "2rem", ["--speler-kleur" as string]: kleur }}>{s.icon ?? "👥"}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.2rem", color: "#fff" }}>
                {rang <= 3 ? ["🥇", "🥈", "🥉"][rang - 1] : `#${rang}`} {s.display_name}
              </div>
              <div style={{ fontSize: "0.78rem", color: "var(--muted)" }}>Login: {s.login_name} · {s.sessie_status === "voltooid" ? "🏁 gefinisht" : "onderweg"}</div>
            </div>
            <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.5rem", color: "#FFE680" }}>{s.score} pt</span>
            <button type="button" className="editor-paneel-sluit" onClick={onSluit} title="Sluiten">✕</button>
          </div>

          {/* Kerngetallen */}
          <div className="detail-cijfers">
            <div><span>⏱</span><strong>{s.started_at ? formateerTijd(sessietijd(s)) : "—"}</strong><small>speeltijd</small></div>
            <div><span>🚶</span><strong>{((verslag?.afstandM ?? s.afstand_m) / 1000).toFixed(2).replace(".", ",")} km</strong><small>gelopen</small></div>
            <div><span>📍</span><strong>{totaalPunten ? `${s.bezochte_punten}/${totaalPunten}` : s.bezochte_punten}</strong><small>punten</small></div>
            <div><span>✅</span><strong>{verslag ? `${goed}/${vragen.length}` : "…"}</strong><small>vragen goed</small></div>
          </div>

          {/* Gelopen route */}
          <div style={{ height: 380, borderRadius: 16, overflow: "hidden", flexShrink: 0 }}>
            {fout ? <p style={{ color: "var(--muted)", fontSize: "0.85rem" }}>Kon de gegevens niet laden.</p>
              : !verslag ? <p style={{ color: "var(--muted)", fontSize: "0.85rem" }}>Kaart laden…</p>
              : verslag.spoor.length < 2 && verslag.punten.length === 0 ? <p style={{ color: "var(--muted)", fontSize: "0.85rem" }}>Nog geen GPS-spoor.</p>
              : <GelopenRouteKaart spoor={verslag.spoor} punten={verslag.punten}
                  items={verslag.items.filter((i) => i.lat != null && i.lng != null).map((i) => ({ soort: i.soort, type: i.type, ander: i.ander, lat: i.lat!, lng: i.lng! }))} />}
          </div>

          {/* Antwoorden */}
          {verslag && verslag.punten.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div className="pr-gem-label">📝 Bezochte punten</div>
              {verslag.punten.map((p) => {
                const kl = p.goed === true ? "#4ADE80" : p.goed === false ? "#F87171" : p.heeftVraag ? "#FBBF24" : "rgba(255,255,255,0.25)";
                return (
                  <div key={p.nr} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "8px 10px", borderRadius: 10, background: "rgba(255,255,255,0.04)", borderLeft: `3px solid ${kl}`, fontSize: "0.82rem" }}>
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
                <div key={n} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: "0.82rem", color: "var(--text)" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/items/${i.type}.webp`} alt="" style={{ width: 24, height: 24 }} />
                  <span style={{ flex: 1 }}>
                    {i.soort === "ingezet"
                      ? `${ITEM_NAAM[i.type] ?? i.type} ingezet${i.ander ? ` op ${i.ander}` : ""}`
                      : `${ITEM_NAAM[i.type] ?? i.type} gekregen${i.ander ? ` van ${i.ander}` : ""}`}
                  </span>
                  <span style={{ color: "var(--muted)", fontSize: "0.74rem" }}>{new Date(i.tijd).toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" })}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
