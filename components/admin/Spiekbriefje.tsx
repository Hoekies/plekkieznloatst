"use client";

import Link from "next/link";
import Icoon from "@/components/admin/Icoon";
import MenuIcoon from "@/components/admin/MenuIcoon";

// 📄 Spiekbriefje voor de dag zelf: een overzichtskaartje van de punten en per punt de vraag met het goede
// antwoord. Wit papier, zwarte letters; met 🖨️ Afdrukken kies je ook "Opslaan als PDF".
export type SpiekPunt = { label: string; naam: string; soort: string; lat: number; lng: number; vraag: string; antwoord: string; punten: number | null };

function Overzicht({ punten }: { punten: SpiekPunt[] }) {
  if (punten.length < 2) return null;
  const lats = punten.map((p) => p.lat), lngs = punten.map((p) => p.lng);
  const [minLat, maxLat, minLng, maxLng] = [Math.min(...lats), Math.max(...lats), Math.min(...lngs), Math.max(...lngs)];
  const k = Math.cos(((minLat + maxLat) / 2) * Math.PI / 180);
  const b = 640, h = 300, rand = 24;
  const sx = (maxLng - minLng) * k || 1e-6, sy = maxLat - minLat || 1e-6;
  const schaal = Math.min((b - 2 * rand) / sx, (h - 2 * rand) / sy);
  const x = (lng: number) => rand + ((lng - minLng) * k) * schaal + ((b - 2 * rand) - sx * schaal) / 2;
  const y = (lat: number) => h - rand - (lat - minLat) * schaal - ((h - 2 * rand) - sy * schaal) / 2;
  return (
    <svg viewBox={`0 0 ${b} ${h}`} className="spiek-kaart" aria-label="Overzicht van de punten">
      <polyline points={punten.map((p) => `${x(p.lng)},${y(p.lat)}`).join(" ")} fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeDasharray="4 4" />
      {punten.map((p, i) => (
        <g key={i}>
          <circle cx={x(p.lng)} cy={y(p.lat)} r="11" fill={p.label === "🏁" ? "#f59e0b" : p.label === "🏠" ? "#16a34a" : "#1e40af"} stroke="#fff" strokeWidth="2" />
          <text x={x(p.lng)} y={y(p.lat) + 4} textAnchor="middle" fontSize="11" fontWeight="800" fill="#fff">{p.label}</text>
        </g>
      ))}
    </svg>
  );
}

export default function Spiekbriefje({ routeNaam, punten }: { routeNaam: string; punten: SpiekPunt[] }) {
  return (
    <>
      <div className="admin-topbar spiek-geen-print">
        <span className="admin-topbar-titel"><MenuIcoon naam="voorproefje" />Spiekbriefje</span>
      </div>
      <div className="admin-content">
        <div className="spiek-knoppen spiek-geen-print">
          <Link href="/admin/routes" className="rl-knop actie-knop">← Routes</Link>
          <button type="button" className="rl-knop rl-knop--cyan actie-knop" onClick={() => window.print()}><Icoon naam="rapport" /> Afdrukken of PDF</button>
          <span className="inst-uitleg">Alleen voor jou: hier staan de goede antwoorden op. Kies in het printvenster ook <em>Opslaan als PDF</em>.</span>
        </div>
        <article className="spiek-vel">
          <header className="spiek-kop">
            <h1>{routeNaam}</h1>
            <span>Spiekbriefje · {punten.length} punten · {new Date().toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" })}</span>
          </header>
          <Overzicht punten={punten} />
          <table className="spiek-tabel">
            <thead><tr><th>#</th><th>Punt en vraag</th><th>Goed antwoord</th><th>pt</th></tr></thead>
            <tbody>
              {punten.map((p, i) => (
                <tr key={i} className={p.soort === "doorlooppunt" ? "spiek-door" : undefined}>
                  <td className="spiek-nr">{p.label}</td>
                  <td>
                    <strong>{p.naam}</strong>
                    {p.soort === "doorlooppunt" ? <span className="spiek-klein"> · doorlopen (geen scherm)</span> : p.vraag ? <div className="spiek-vraag">{p.vraag}</div> : <span className="spiek-klein"> · nog geen vraag</span>}
                  </td>
                  <td className="spiek-antwoord">{p.antwoord}</td>
                  <td className="spiek-pt">{p.punten ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </article>
      </div>
    </>
  );
}
