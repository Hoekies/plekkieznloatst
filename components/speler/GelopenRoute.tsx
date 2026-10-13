"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import type { RouteSpoorPunt, BezochtPunt, KaartItem } from "./GelopenRouteKaart";

const GelopenRouteKaart = dynamic(() => import("./GelopenRouteKaart"), { ssr: false });

// terugNaar = knop "← Terug" (speler). Zonder terugNaar is het de openbare pagina die via de
// link van de beheerder (rapport → Kaart-link) wordt geopend.
export default function GelopenRoute({ spoor, punten, items, afstandM, titel = "Jullie gelopen route", ondertitel, terugNaar }: {
  spoor: RouteSpoorPunt[]; punten: BezochtPunt[]; items: KaartItem[]; afstandM: number;
  titel?: string; ondertitel?: string; terugNaar?: string;
}) {
  const router = useRouter();
  return (
    <div style={{ minHeight: "100%", background: "var(--game-gradient)", display: "flex", flexDirection: "column", padding: "20px 16px 32px", gap: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {terugNaar ? (
          <button onClick={() => router.push(terugNaar)}
            style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 10, padding: "6px 14px", color: "#fff", fontSize: "0.85rem", cursor: "pointer" }}>
            ← Terug
          </button>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src="/logo.webp" alt="PointRush" style={{ height: 44, width: "auto" }} />
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ margin: 0, fontSize: "1.2rem", color: "#fff", fontWeight: 800 }}>{titel}</h1>
          {ondertitel && <div style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.7)" }}>{ondertitel}</div>}
        </div>
      </div>
      <p style={{ margin: 0, color: "rgba(255,255,255,0.7)", fontSize: "0.85rem" }}>
        {(afstandM / 1000).toFixed(2).replace(".", ",")} km gelopen · {punten.length} punten bezocht.
        De paarse lijn is het GPS-spoor, de groene bolletjes zijn de punten in de volgorde waarin ze gehaald zijn. Tik op een punt voor meer.
        {items.length > 0 && " Item-icoontjes met een blauwe rand hebben jullie ingezet, met een oranje rand kregen jullie van een ander team. Tik erop voor meer."}
      </p>
      <div style={{ flex: 1, minHeight: 380 }}>
        {spoor.length < 2 && punten.length === 0
          ? <p style={{ color: "rgba(255,255,255,0.7)" }}>Er is geen GPS-spoor opgeslagen voor jullie spel.</p>
          : <GelopenRouteKaart spoor={spoor} punten={punten} items={items} />}
      </div>
    </div>
  );
}
