"use client";

import type { GroepPlaatjes, TeamPlaatjes } from "@/lib/deel-plaatjes";
import { BADGES, isBadge, mascotteVoor, levelVoor } from "@/lib/spelplezier";

// 🖼️ Deelplaatjes na afloop (alleen plaatjes, geen losse tekst). Elk kaartje is 540 px breed en wordt met
// elementNaarPng een PNG. Routes worden als lijnen getekend (SVG) op een eigen achtergrond: kaarttegels van een
// andere site kunnen niet in een plaatje.

const getal = (x: number) => x.toString().replace(".", ",");
const medaille = (r: number) => (r === 1 ? "🥇" : r === 2 ? "🥈" : r === 3 ? "🥉" : `${r}.`);

// Kop en voet die alle kaartjes delen
function Kader({ titel, route, logo, datum, children, klasse = "" }: { titel: string; route: string; logo: string | null; datum: string; children: React.ReactNode; klasse?: string }) {
  return (
    <div className={`uitslag-kaart deelkaart ${klasse}`}>
      <div className="uitslag-kaart-logos">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/spellogo/vierkant.webp" alt="" className="uitslag-kaart-logo deelkaart-logo" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {logo && <img src={logo} alt="" crossOrigin="anonymous" className="uitslag-kaart-huislogo" />}
      </div>
      <div className="uitslag-kaart-kop deelkaart-kop">{titel}</div>
      <div className="uitslag-kaart-route">{route}</div>
      {children}
      <div className="uitslag-kaart-voet">{datum} · PointRush by Hoekies</div>
    </div>
  );
}

// Teamfoto of icoon in een rondje
function Gezicht({ foto, icon, maat = 40, rand = "#FFD93B" }: { foto: string | null; icon: string | null; maat?: number; rand?: string }) {
  return foto
    // eslint-disable-next-line @next/next/no-img-element
    ? <img src={foto} alt="" crossOrigin="anonymous" className="deelkaart-gezicht" style={{ width: maat, height: maat, borderColor: rand }} />
    : <span className="deelkaart-gezicht deelkaart-gezicht--icoon" style={{ width: maat, height: maat, fontSize: maat * 0.62, borderColor: rand }}>{icon ?? "👫"}</span>;
}

// ── 🗺️ Sporen als lijnen: lat/lng naar x/y binnen het vlak (oost-west gecorrigeerd voor de breedtegraad) ──
function maakProjectie(alle: [number, number][], b: number, h: number, marge: number) {
  if (!alle.length) return () => [b / 2, h / 2] as [number, number];
  const lats = alle.map((p) => p[0]), lngs = alle.map((p) => p[1]);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats), minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  const k = Math.cos((((minLat + maxLat) / 2) * Math.PI) / 180);
  const breedte = Math.max(1e-6, (maxLng - minLng) * k), hoogte = Math.max(1e-6, maxLat - minLat);
  const schaal = Math.min((b - 2 * marge) / breedte, (h - 2 * marge) / hoogte);
  const ox = (b - breedte * schaal) / 2, oy = (h - hoogte * schaal) / 2;
  return ([lat, lng]: [number, number]): [number, number] => [ox + (lng - minLng) * k * schaal, oy + (maxLat - lat) * schaal];
}
const pad = (pts: [number, number][]) => pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");

function SporenKaart({ sporen, punten, b = 476, h = 420, overlay }: {
  sporen: { pts: [number, number][]; kleur: string }[];
  punten: { lat: number; lng: number; label?: string; soort?: "start" | "finish" | "punt" }[];
  b?: number; h?: number;
  overlay?: (proj: (p: [number, number]) => [number, number]) => React.ReactNode;
}) {
  const proj = maakProjectie([...sporen.flatMap((s) => s.pts), ...punten.map((p): [number, number] => [p.lat, p.lng])], b, h, 30);
  return (
    <div className="deelkaart-kaart" style={{ width: b, height: h }}>
      <svg width={b} height={h} viewBox={`0 0 ${b} ${h}`}>
        <defs>
          <pattern id="raster" width="28" height="28" patternUnits="userSpaceOnUse"><path d="M28 0H0V28" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" /></pattern>
        </defs>
        <rect width={b} height={h} rx="18" style={{ fill: "rgb(var(--o1))" }} />
        <rect width={b} height={h} rx="18" fill="url(#raster)" />
        {sporen.map((s, i) => s.pts.length > 1 && (
          <g key={i}>
            <path d={pad(s.pts.map(proj))} fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
            <path d={pad(s.pts.map(proj))} fill="none" stroke={s.kleur} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          </g>
        ))}
        {punten.map((p, i) => {
          const [x, y] = proj([p.lat, p.lng]);
          return <circle key={i} cx={x} cy={y} r={p.soort === "punt" ? 6 : 8} fill={p.soort === "start" ? "#4ADE80" : p.soort === "finish" ? "#FFD93B" : "#fff"} stroke="#1e1150" strokeWidth="2.5" />;
        })}
      </svg>
      {/* Emoji en labels als HTML erboven (scherper in het plaatje) */}
      {punten.filter((p) => p.label).map((p, i) => {
        const [x, y] = proj([p.lat, p.lng]);
        return <span key={i} className="deelkaart-kaart-label" style={{ left: x, top: y }}>{p.label}</span>;
      })}
      {overlay?.(proj)}
    </div>
  );
}

// ── 1. Uitslag en cijfers ──────────────────────────────────────────────────
export function UitslagCijfersKaart({ d }: { d: GroepPlaatjes }) {
  return (
    <Kader titel="Uitslag" route={d.route} logo={d.huis_logo} datum={d.datum} klasse="cijfers-kaart">
      <div className="cijfers-stand">
        {d.teams.map((t) => (
          <div key={t.sessie} className={`cijfers-team${t.rank <= 3 ? ` cijfers-team--${t.rank}` : ""}`}>
            <div className="cijfers-team-kop">
              <span className="cijfers-plek">{medaille(t.rank)}</span>
              <Gezicht foto={t.foto} icon={t.icon} />
              <span className="cijfers-naam">{t.naam}{t.prijs && <small>{t.prijs.emoji} {t.prijs.titel}</small>}</span>
              <strong className="cijfers-score">{t.score} pt</strong>
            </div>
            {t.stat && (
              <div className="cijfers-chips">
                <span>✅ {t.stat.goed} goed</span>
                {t.stat.fout > 0 && <span>❌ {t.stat.fout} fout</span>}
                {t.stat.snelste !== null && <span>⚡ {t.stat.snelste} s</span>}
                <span>👟 {getal(t.stat.km)} km</span>
                {t.stat.itemsIngezet > 0 && <span>🎁 {t.stat.itemsIngezet} {t.stat.itemsIngezet === 1 ? "item" : "items"}</span>}
                {t.stat.geraakt > 0 && <span>🎯 {t.stat.geraakt}× geraakt</span>}
              </div>
            )}
          </div>
        ))}
      </div>
      {d.records.length > 0 && (
        <div className="cijfers-records">
          <div className="cijfers-records-kop">🏅 Records</div>
          {d.records.map((r) => <div key={r.titel}><span>{r.emoji} {r.titel}</span><strong>{r.team}</strong><em>{r.waarde}</em></div>)}
        </div>
      )}
    </Kader>
  );
}

// ── 2. Routeposter: alle gelopen routes in de teamkleur, met de winnaar gekroond ──
export function RoutePosterKaart({ d }: { d: GroepPlaatjes }) {
  const punten = d.punten.map((p, i) => ({ lat: p.lat, lng: p.lng, soort: (p.type === "eindpunt" ? "finish" : i === 0 ? "start" : "punt") as "start" | "finish" | "punt", label: p.type === "eindpunt" ? "🏁" : undefined }));
  return (
    <Kader titel="Onze routes" route={d.route} logo={d.huis_logo} datum={d.datum}>
      <SporenKaart sporen={[...d.teams].reverse().map((t) => ({ pts: t.spoor, kleur: t.kleur }))} punten={punten} h={460}
        overlay={(proj) => d.teams.filter((t) => t.spoor.length).map((t) => {
          const [x, y] = proj(t.spoor[t.spoor.length - 1]);
          return <span key={t.sessie} className="deelkaart-kaart-team" style={{ left: x, top: y, borderColor: t.kleur }}>{t.rank === 1 ? "👑" : t.icon ?? "👫"}</span>;
        })} />
      <div className="deelkaart-legenda">
        {d.teams.map((t) => <span key={t.sessie}><i style={{ background: t.kleur }} />{t.rank === 1 ? "👑 " : ""}{t.naam}{t.stat ? ` · ${getal(t.stat.km)} km` : ""}</span>)}
      </div>
    </Kader>
  );
}

// ── 3. Prijzenuitreiking: alle titels als awards ─────────────────────────────
export function PrijzenKaart({ d }: { d: GroepPlaatjes }) {
  const metPrijs = d.teams.filter((t) => t.prijs);
  return (
    <Kader titel="Prijzen" route={d.route} logo={d.huis_logo} datum={d.datum}>
      <div className="deelkaart-awards">
        {metPrijs.map((t) => (
          <div key={t.sessie} className="deelkaart-award">
            <span className="deelkaart-award-emoji">{t.prijs!.emoji}</span>
            <strong className="deelkaart-award-titel">{t.prijs!.titel}</strong>
            <span className="deelkaart-award-uitleg">{t.prijs!.uitleg}</span>
            <span className="deelkaart-award-team"><Gezicht foto={t.foto} icon={t.icon} maat={34} rand={t.kleur} /> {t.naam}</span>
          </div>
        ))}
      </div>
    </Kader>
  );
}

// ── 4. Rivaliteiten: wie gooide wat op wie (pijlen tussen de teams) ──────────
export function RivaliteitenKaart({ d }: { d: GroepPlaatjes }) {
  const b = 476, h = 476, cx = b / 2, cy = h / 2, r = 175;
  const teams = d.teams.filter((t) => d.rivaliteit.some((x) => x.van === t.sessie || x.naar === t.sessie));
  const plek = new Map(teams.map((t, i) => {
    const hoek = -Math.PI / 2 + (2 * Math.PI * i) / Math.max(1, teams.length);
    return [t.sessie, [cx + r * Math.cos(hoek), cy + r * Math.sin(hoek)] as [number, number]];
  }));
  const max = Math.max(1, ...d.rivaliteit.map((x) => x.aantal));
  const lijnen = d.rivaliteit.filter((x) => plek.has(x.van) && plek.has(x.naar)).map((x) => {
    const [x1, y1] = plek.get(x.van)!, [x2, y2] = plek.get(x.naar)!;
    // Beetje gebogen, zodat heen en terug niet over elkaar lopen; de pijlpunt stopt vóór het rondje
    const mx = (x1 + x2) / 2, my = (y1 + y2) / 2, nx = -(y2 - y1), ny = x2 - x1, len = Math.hypot(nx, ny) || 1;
    const qx = mx + (nx / len) * 28, qy = my + (ny / len) * 28;
    const ex = x2 - ((x2 - qx) / Math.hypot(x2 - qx, y2 - qy)) * 34, ey = y2 - ((y2 - qy) / Math.hypot(x2 - qx, y2 - qy)) * 34;
    const hoek = Math.atan2(ey - qy, ex - qx);
    const pijl = [[ex, ey], [ex - 13 * Math.cos(hoek - 0.45), ey - 13 * Math.sin(hoek - 0.45)], [ex - 13 * Math.cos(hoek + 0.45), ey - 13 * Math.sin(hoek + 0.45)]];
    const kleur = teams.find((t) => t.sessie === x.van)?.kleur ?? "#fff";
    return { ...x, d: `M${x1},${y1} Q${qx},${qy} ${ex},${ey}`, pijl: pijl.map((p) => p.join(",")).join(" "), kleur, dik: 2 + (6 * x.aantal) / max, lx: (mx + qx) / 2, ly: (my + qy) / 2 };
  });
  return (
    <Kader titel="Rivalen" route={d.route} logo={d.huis_logo} datum={d.datum}>
      <div className="deelkaart-kaart" style={{ width: b, height: h }}>
        <svg width={b} height={h}>
          <rect width={b} height={h} rx="18" style={{ fill: "rgb(var(--o1))" }} />
          {lijnen.map((l, i) => (
            <g key={i}>
              <path d={l.d} fill="none" stroke={l.kleur} strokeWidth={l.dik} strokeLinecap="round" opacity="0.9" />
              <polygon points={l.pijl} fill={l.kleur} />
            </g>
          ))}
        </svg>
        {lijnen.map((l, i) => (
          <span key={i} className="deelkaart-rival-label" style={{ left: l.lx, top: l.ly }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/items/${l.item}.webp`} alt="" />{l.aantal}×
          </span>
        ))}
        {teams.map((t) => {
          const [x, y] = plek.get(t.sessie)!;
          return (
            // Naam aan de buitenkant van de cirkel, zodat hij nooit over een pijl valt
            <span key={t.sessie} className={`deelkaart-rival-team${y < cy - 1 ? " deelkaart-rival-team--boven" : ""}`} style={{ left: x, top: y }}>
              <Gezicht foto={t.foto} icon={t.icon} maat={52} rand={t.kleur} />
              <small>{t.naam}</small>
            </span>
          );
        })}
      </div>
      {lijnen[0] && <div className="deelkaart-rival-top">🔥 Grootste rivaliteit: <strong>{teams.find((t) => t.sessie === lijnen[0].van)?.naam}</strong> → <strong>{teams.find((t) => t.sessie === lijnen[0].naar)?.naam}</strong> ({lijnen[0].aantal}×)</div>}
    </Kader>
  );
}

// ── 6. Teamkaart: de oorkonde als verzamelkaart ──────────────────────────────
export function TeamKaart({ d }: { d: TeamPlaatjes }) {
  const m = mascotteVoor(d.score), l = levelVoor(d.score);
  const s = d.stat;
  return (
    <div className="teamkaart">
      <div className="teamkaart-binnen">
        <div className="teamkaart-kop">
          <span className="teamkaart-plaats">{d.plaats ? medaille(d.plaats) : "🏅"}</span>
          <span className="teamkaart-route">{d.route}</span>
          <span className="teamkaart-score">{d.score}<small>pt</small></span>
        </div>
        <div className="teamkaart-foto">
          {d.foto
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={d.foto} alt="" crossOrigin="anonymous" />
            : <span>{d.icon ?? "👫"}</span>}
          {(d.mascotte || d.levels) && (
            <div className="teamkaart-rang">{d.mascotte && <span>{m.emoji}</span>}{d.levels && <span>{l.emoji} {l.naam}</span>}</div>
          )}
        </div>
        <div className="teamkaart-naam">{d.naam}</div>
        {d.prijs && <div className="teamkaart-prijs">{d.prijs.emoji} {d.prijs.titel}</div>}
        <div className="teamkaart-stats">
          <div><strong>{d.plaats ?? "–"}<small>/{d.aantal}</small></strong><span>plaats</span></div>
          <div><strong>{getal(d.km)}</strong><span>km</span></div>
          <div><strong>{d.minuten}</strong><span>minuten</span></div>
          <div><strong>{s?.goed ?? 0}</strong><span>goed</span></div>
          <div><strong>{s?.snelste !== null && s?.snelste !== undefined ? `${s.snelste}s` : "–"}</strong><span>snelste</span></div>
          <div><strong>{s?.itemsIngezet ?? 0}</strong><span>items</span></div>
        </div>
        {d.badges.filter(isBadge).length > 0 && (
          <div className="teamkaart-badges">{d.badges.filter(isBadge).map((b) => <span key={b} title={BADGES[b].naam}>{BADGES[b].emoji}</span>)}</div>
        )}
        <div className="teamkaart-voet">{d.datum} · PointRush</div>
      </div>
    </div>
  );
}

// ── 7. Ons rondje: het eigen gelopen spoor met de punten ─────────────────────
export function OnsRondjeKaart({ d }: { d: TeamPlaatjes }) {
  const punten = d.punten.map((p, i) => ({ lat: p.lat, lng: p.lng, soort: (i === d.punten.length - 1 ? "finish" : i === 0 ? "start" : "punt") as "start" | "finish" | "punt", label: i === d.punten.length - 1 ? "🏁" : undefined }));
  return (
    <Kader titel="Ons rondje" route={d.route} logo={d.huis_logo} datum={d.datum}>
      <div className="deelkaart-rondje-team"><Gezicht foto={d.foto} icon={d.icon} maat={44} /> <strong>{d.naam}</strong></div>
      <SporenKaart sporen={[{ pts: d.spoor, kleur: "#22D3EE" }]} punten={punten} h={440} />
      <div className="deelkaart-rondje-cijfers">
        <span>👟 <strong>{getal(d.km)}</strong> km</span>
        <span>⏱️ <strong>{d.minuten}</strong> min</span>
        <span>📍 <strong>{d.punten.length}</strong> punten</span>
        <span>⭐ <strong>{d.score}</strong> pt</span>
      </div>
    </Kader>
  );
}
