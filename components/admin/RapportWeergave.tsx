"use client";

import dynamic from "next/dynamic";
import type { AntwoordenData, TeamAntwoorden } from "@/lib/admin-antwoorden";
import type { RouteVerslag, VerslagItem } from "@/lib/team-verslag";
import { formateerTijd } from "@/lib/geo";
import { ITEM_INFO } from "@/components/speler/SpeciaalItemLegende";

const GelopenRouteKaart = dynamic(() => import("@/components/speler/GelopenRouteKaart"), { ssr: false });

const MEDAILLE = ["🥇", "🥈", "🥉"];

function speeltijd(t: TeamAntwoorden): number {
  if (!t.started_at || !t.finished_at) return 0;
  return Math.floor((new Date(t.finished_at).getTime() - new Date(t.started_at).getTime()) / 1000);
}
function km(m: number) { return `${(m / 1000).toFixed(2).replace(".", ",")} km`; }
function itemWie(i: VerslagItem) {
  if (i.soort === "ingezet") return i.ander ? `tegen ${i.ander}` : i.type === "vraagteken" ? "gok (raakt iedereen)" : "voor zichzelf";
  return i.type === "plekzooi" ? "verborgen val op de kaart" : `van ${i.ander ?? "een ander team"}`;
}

export default function RapportWeergave({ data, verslagen, fotoUrls, gemaaktOp }: {
  data: AntwoordenData;
  verslagen: Record<string, RouteVerslag>;
  fotoUrls: Record<string, string>;
  gemaaktOp: string;
}) {
  if (!data.route) return <div className="admin-content"><p style={{ color: "var(--muted)" }}>Er is geen actieve route.</p></div>;

  // Eindstand: hoogste score bovenaan, bij gelijke score de snelste
  const routeNaam = data.route.name;
  const stand = [...data.teams].sort((a, b) => b.score - a.score || (speeltijd(a) || Infinity) - (speeltijd(b) || Infinity));
  const voorlopig = !data.uitslag_vrijgegeven || data.wachtende_fotos > 0 || data.teams.some((t) => t.status !== "voltooid");

  return (
    <div className="rapport-wrap">
      <style>{`
        .rapport-wrap { padding: 24px; }
        .rapport-papier {
          background: linear-gradient(180deg, #3a1a73 0%, #1c0c45 55%, #0c0322 100%);
          color: #fff; max-width: 860px; margin: 0 auto 24px; padding: 30px 34px; border-radius: 18px;
          border: 2px solid rgba(255,217,59,0.55); box-shadow: 0 0 24px rgba(255,217,59,0.15);
          font-family: var(--font);
          -webkit-print-color-adjust: exact; print-color-adjust: exact;
        }
        .rapport-papier h1, .rapport-papier h2, .rapport-papier h3 { color: #fff; margin: 0; font-family: var(--font-display); font-weight: 800; }
        .rapport-papier h3 { color: #FFE680; }
        .rapport-papier table { width: 100%; border-collapse: separate; border-spacing: 0; font-size: 0.85rem;
          background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); border-radius: 12px; overflow: hidden; }
        .rapport-papier th { text-align: left; color: #B8AED6; font-weight: 700; padding: 8px 10px; background: rgba(0,0,0,0.25); }
        .rapport-papier td { border-top: 1px solid rgba(255,255,255,0.08); padding: 7px 10px; vertical-align: top; }
        .rapport-kop { display: flex; align-items: center; gap: 14px; }
        .rapport-kaart { height: 360px; margin-top: 8px; border-radius: 14px; overflow: hidden; border: 2px solid rgba(255,255,255,0.15); }
        .rapport-kaart > div { min-height: 0 !important; height: 100% !important; }
        .rapport-blok { break-inside: avoid; page-break-inside: avoid; }
        @media print {
          @page { size: A4; margin: 0; }
          .admin-sidebar, .admin-mobile-topbar, .admin-topbar, .rapport-knoppen { display: none !important; }
          /* Donkere achtergrond op de hele pagina, ook waar de inhoud ophoudt: geen witte stukken */
          html, body, .admin-shell, .admin-main {
            background: #1c0c45 !important; height: auto !important; overflow: visible !important;
            -webkit-print-color-adjust: exact; print-color-adjust: exact;
          }
          .rapport-wrap { padding: 0; }
          .rapport-papier {
            max-width: none; margin: 0; border-radius: 0; border: none; box-shadow: none;
            padding: 12mm 14mm; background: #1c0c45;
            -webkit-box-decoration-break: clone; box-decoration-break: clone;
          }
          .rapport-team, .rapport-slot { break-before: page; page-break-before: always; }
          .leaflet-control-container { display: none; }
          tr, .rapport-item { break-inside: avoid; page-break-inside: avoid; }
          thead { display: table-header-group; }
          .rapport-kaart { height: 300px; }
        }
      `}</style>

      <div className="rapport-knoppen" style={{ maxWidth: 860, margin: "0 auto 16px", display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <button className="rl-knop rl-knop--cyan" onClick={() => window.print()}>🖨️ Opslaan als PDF / afdrukken</button>
        <span style={{ fontSize: "0.8rem", color: "var(--muted)" }}>
          Kies in het printvenster &quot;Opslaan als PDF&quot;. Wacht even tot alle kaarten geladen zijn.
        </span>
      </div>

      {/* ── Eindstand ── */}
      <div className="rapport-papier">
        <div style={{ textAlign: "center" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-breed-strak.webp" alt="PointRush" style={{ height: 110, width: "auto" }} />
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, color: "#FFE680", letterSpacing: "0.08em", marginTop: 10 }}>SPELRAPPORT</div>
          <h1 style={{ fontSize: "1.8rem", marginTop: 2 }}>{data.route.name}</h1>
        </div>
        <div style={{ fontSize: "0.8rem", color: "#B8AED6", marginTop: 2, textAlign: "center" }}>
          Gemaakt op {new Date(gemaaktOp).toLocaleString("nl-NL", { dateStyle: "long", timeStyle: "short" })}
        </div>
        {voorlopig && (
          <div style={{ marginTop: 12, padding: "8px 12px", borderRadius: 8, background: "rgba(255,217,59,0.14)", border: "1px solid rgba(255,217,59,0.5)", color: "#FFE680", fontSize: "0.82rem" }}>
            ⚠️ Voorlopige stand:
            {data.teams.some((t) => t.status !== "voltooid") && " niet alle teams zijn gefinisht."}
            {data.wachtende_fotos > 0 && ` Er ${data.wachtende_fotos === 1 ? "is" : "zijn"} nog ${data.wachtende_fotos} foto${data.wachtende_fotos === 1 ? "" : "'s"} niet gekeurd.`}
            {!data.uitslag_vrijgegeven && " De uitslag is nog niet vrijgegeven."}
          </div>
        )}

        {stand[0] && (
          <div className="rapport-blok" style={{
            marginTop: 20, padding: "22px 16px", borderRadius: 18, textAlign: "center",
            background: "radial-gradient(circle at 50% 0%, rgba(255,217,59,0.35), rgba(255,138,0,0.12) 60%, rgba(0,0,0,0.15))",
            border: "2px solid rgba(255,217,59,0.7)", boxShadow: "0 0 30px rgba(255,217,59,0.25)",
          }}>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, letterSpacing: "0.12em", color: "#FFE680", fontSize: "0.95rem" }}>
              {voorlopig ? "AAN KOP (VOORLOPIG)" : "🏆 DE WINNAAR 🏆"}
            </div>
            <div style={{ fontSize: "4.5rem", lineHeight: 1.1, marginTop: 6 }}>{stand[0].icon ?? "🥇"}</div>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "2.6rem", lineHeight: 1.1, color: "#fff", textShadow: "0 3px 0 rgba(0,0,0,0.35)" }}>
              {stand[0].naam}
            </div>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.6rem", color: "#00d9ff", marginTop: 4 }}>
              {stand[0].score} punten
            </div>
          </div>
        )}

        <h2 style={{ fontSize: "1.2rem", marginTop: 22, marginBottom: 8 }}>🏆 Eindstand</h2>
        <table>
          <thead>
            <tr><th>#</th><th>Team</th><th style={{ textAlign: "right" }}>Punten</th><th>Speeltijd</th><th>Afstand</th><th>Status</th></tr>
          </thead>
          <tbody>
            {stand.map((t, i) => (
              <tr key={t.sessie_id}>
                <td style={{ fontSize: "1.1rem" }}>{MEDAILLE[i] ?? i + 1}</td>
                <td style={{ fontWeight: 700 }}>{t.icon ?? "👥"} {t.naam}</td>
                <td style={{ textAlign: "right", fontWeight: 800, fontSize: "1.05rem", color: "#00d9ff" }}>{t.score}</td>
                <td>{speeltijd(t) ? formateerTijd(speeltijd(t)) : "—"}</td>
                <td>{km(verslagen[t.sessie_id]?.afstandM ?? 0)}</td>
                <td>{t.status === "voltooid" ? "Gefinisht" : "Onderweg"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Per team ── */}
      {stand.map((t, i) => {
        const v = verslagen[t.sessie_id];
        const items = [...(v?.items ?? [])].sort((a, b) => a.tijd.localeCompare(b.tijd));
        return (
          <div key={t.sessie_id} className="rapport-papier rapport-team">
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-breed-strak.webp" alt="PointRush" style={{ height: 42, width: "auto" }} />
              <span style={{ marginLeft: "auto", fontSize: "0.75rem", color: "#B8AED6" }}>{routeNaam}</span>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
              <h2 style={{ fontSize: "1.4rem" }}>{MEDAILLE[i] ?? `${i + 1}.`} {t.icon ?? "👥"} {t.naam}</h2>
              <span style={{ marginLeft: "auto", fontFamily: "var(--font-display)", fontSize: "1.5rem", fontWeight: 800, color: "#00d9ff" }}>{t.score} punten</span>
            </div>
            <div style={{ fontSize: "0.85rem", color: "#D4CCF0", marginTop: 4 }}>
              {i + 1}e plaats · speeltijd {speeltijd(t) ? formateerTijd(speeltijd(t)) : "—"} · {km(v?.afstandM ?? 0)} gelopen · {t.rijen.length} vragen beantwoord · {items.length} items
            </div>

            <h3 style={{ fontSize: "1.05rem", marginTop: 18, marginBottom: 6 }}>❓ Vragen</h3>
            {t.rijen.length === 0 ? <p style={{ fontSize: "0.85rem", color: "#B8AED6" }}>Geen vragen beantwoord.</p> : (
              <table>
                <thead><tr><th>#</th><th>Punt &amp; vraag</th><th>Antwoord</th><th style={{ textAlign: "right" }}>Punten</th></tr></thead>
                <tbody>
                  {t.rijen.map((r, n) => {
                    const isFoto = r.vraag_type === "foto_opdracht";
                    const goed = isFoto ? r.foto_status === "goedgekeurd" : r.is_correct;
                    return (
                      <tr key={r.voortgang_id}>
                        <td>{n + 1}</td>
                        <td><div style={{ color: "#B8AED6", fontSize: "0.75rem" }}>{r.punt_naam}</div>{r.vraag_tekst}</td>
                        <td>
                          {isFoto ? (
                            <>
                              {r.foto_pad && fotoUrls[r.foto_pad] && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={fotoUrls[r.foto_pad]} alt="Foto" style={{ width: 140, maxHeight: 105, objectFit: "cover", borderRadius: 6, display: "block" }} />
                              )}
                              <span style={{ fontSize: "0.75rem", color: r.foto_status === "wacht" ? "#FBBF24" : goed ? "#4ADE80" : "#F87171" }}>
                                {r.foto_status === "wacht" ? "⏳ nog niet gekeurd" : goed ? "✓ goedgekeurd" : "✗ afgekeurd"}
                              </span>
                            </>
                          ) : (
                            <>
                              <span style={{ color: goed ? "#4ADE80" : "#F87171", fontWeight: 600 }}>{goed ? "✓" : "✗"} {r.antwoord ?? "—"}</span>
                              {!goed && r.juiste_antwoord && <div style={{ fontSize: "0.75rem", color: "#B8AED6" }}>goed: {r.juiste_antwoord}</div>}
                            </>
                          )}
                        </td>
                        <td style={{ textAlign: "right", fontWeight: 700 }}>{r.punten} / {r.max_punten}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}

            <h3 style={{ fontSize: "1.05rem", marginTop: 18, marginBottom: 6 }}>🎁 Items</h3>
            {items.length === 0 ? <p style={{ fontSize: "0.85rem", color: "#B8AED6" }}>Geen items ingezet of ontvangen.</p> : (
              <table>
                <thead><tr><th>Tijd</th><th>Item</th><th>Wat</th></tr></thead>
                <tbody>
                  {items.map((it, n) => (
                    <tr key={n} className="rapport-item">
                      <td style={{ whiteSpace: "nowrap" }}>{new Date(it.tijd).toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" })}</td>
                      <td style={{ whiteSpace: "nowrap" }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={`/items/${it.type}.png`} alt="" style={{ width: 20, height: 20, verticalAlign: "middle", marginRight: 6 }} />
                        {ITEM_INFO[it.type]?.naam ?? it.type}
                      </td>
                      <td>
                        <strong style={{ color: it.soort === "ingezet" ? "#67E8F9" : "#FDBA74" }}>{it.soort === "ingezet" ? "Ingezet" : "Ontvangen"}</strong> {itemWie(it)}
                        {it.omschrijving && <div style={{ fontSize: "0.75rem", color: "#B8AED6" }}>{it.omschrijving}</div>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            <div className="rapport-blok">
            <h3 style={{ fontSize: "1.05rem", marginTop: 18 }}>🗺️ Gelopen route</h3>
            <div style={{ fontSize: "0.75rem", color: "#B8AED6" }}>
              Paars = GPS-spoor · groen = punten in volgorde · blauwe rand = item ingezet · oranje rand = item ontvangen
            </div>
            <div className="rapport-kaart">
              {v && (v.spoor.length > 1 || v.punten.length > 0)
                ? <GelopenRouteKaart spoor={v.spoor} punten={v.punten}
                    items={v.items.filter((x) => x.lat != null && x.lng != null).map((x) => ({ soort: x.soort, type: x.type, ander: x.ander, lat: x.lat!, lng: x.lng! }))} />
                : <p style={{ fontSize: "0.85rem", color: "#B8AED6" }}>Geen GPS-spoor opgeslagen.</p>}
            </div>
            </div>
          </div>
        );
      })}

      {/* ── Dankwoord van de organisatie ── */}
      <div className="rapport-papier rapport-slot">
        <div className="rapport-blok" style={{ textAlign: "center", padding: "30px 10px" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-breed-strak.webp" alt="PointRush" style={{ height: 90, width: "auto" }} />
          <div style={{ fontSize: "3rem", marginTop: 18 }}>🍌🙏</div>
          <h2 style={{ fontSize: "1.7rem", marginTop: 8 }}>Bedankt voor het spelen!</h2>
          <p style={{ fontSize: "1.1rem", lineHeight: 1.6, color: "#E9E3FF", maxWidth: 520, margin: "14px auto 0" }}>
            En voor al het dwarszitten. We weten heus wie die bommen gooide. 👀<br />
            Nog een banaan over? Eet hem lekker zelf op. Of leg hem stiekem bij de buren op de stoep, gewoon voor de gezelligheid. 🍌
          </p>
          <p style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.25rem", color: "#FFE680", marginTop: 22 }}>
            Bedankt en tot de volgende keer!
          </p>
          <p style={{ fontSize: "1rem", color: "#fff", margin: "4px 0 0", fontStyle: "italic" }}>
            Hoekies (alias René)
          </p>
        </div>
      </div>
    </div>
  );
}
