"use client";

import { useEffect, useState } from "react";
import { BADGES, isBadge, type BadgeSoort } from "@/lib/spelplezier";

// 🎉 Spelplezier bij de finish (migratie 007): de verdiende 🎖️ badges en de 📸 fotobattle.

// De badges van dit team (ook na de finish)
export function useBadges(): BadgeSoort[] {
  const [badges, setBadges] = useState<BadgeSoort[]>([]);
  useEffect(() => {
    fetch("/api/speler/spelplezier", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null))
      .then((d: { badges?: { soort: string }[] } | null) => setBadges((d?.badges ?? []).map((b) => b.soort).filter(isBadge)))
      .catch(() => undefined);
  }, []);
  return badges;
}

export function BadgeRij({ badges }: { badges: BadgeSoort[] }) {
  if (!badges.length) return null;
  return (
    <div className="badge-rij">
      <div className="badge-rij-kop">🎖️ Jullie badges</div>
      <div className="badge-rij-lijst">
        {badges.map((b) => (
          <span key={b} className="badge" title={BADGES[b].uitleg}>
            <span aria-hidden>{BADGES[b].emoji}</span> {BADGES[b].naam}
          </span>
        ))}
      </div>
    </div>
  );
}

type Foto = { sessie_id: string; naam: string; icon: string | null; url: string };

// 📸 Fotobattle: stem op de mooiste finishfoto van een ander team (aanpassen mag tot de uitslag)
export function FotoBattle() {
  const [data, setData] = useState<{ aan: boolean; fotos?: Foto[]; mijn_stem?: string | null } | null>(null);
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState("");

  useEffect(() => {
    let weg = false;
    const haal = () => fetch("/api/speler/fotobattle", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (!weg && d) setData(d); }).catch(() => undefined);
    haal();
    // Er komen foto's bij zodra andere teams finishen
    const t = setInterval(haal, 20_000);
    return () => { weg = true; clearInterval(t); };
  }, []);

  async function stem(sessieId: string) {
    setBezig(true); setFout("");
    const res = await fetch("/api/speler/fotobattle", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessie_id: sessieId }) }).catch(() => null);
    const d = res ? await res.json().catch(() => ({})) : {};
    setBezig(false);
    if (!res?.ok) { setFout(d.fout ?? "Geen verbinding, probeer het opnieuw"); return; }
    setData((oud) => oud && { ...oud, mijn_stem: sessieId });
  }

  if (!data?.aan) return null;
  const fotos = data.fotos ?? [];
  return (
    <div className="fotobattle">
      <div className="fotobattle-kop">📸 Fotobattle</div>
      <p className="fotobattle-uitleg">Stem op de mooiste finishfoto van een ander team. De winnaar krijgt een prijs bij de uitslag. Je kunt je stem aanpassen tot de uitslag bekend is.</p>
      {fotos.length === 0 ? (
        <p className="fotobattle-leeg">Nog geen foto&apos;s van andere teams. Ze verschijnen hier zodra die teams binnen zijn.</p>
      ) : (
        <div className="fotobattle-raster">
          {fotos.map((f) => (
            <button key={f.sessie_id} type="button" disabled={bezig} onClick={() => stem(f.sessie_id)}
              className={`fotobattle-foto${data.mijn_stem === f.sessie_id ? " fotobattle-foto--gekozen" : ""}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={f.url} alt={`Foto van ${f.naam}`} />
              <span>{f.icon ?? "👫"} {f.naam}{data.mijn_stem === f.sessie_id ? " · ❤️ jullie stem" : ""}</span>
            </button>
          ))}
        </div>
      )}
      {fout && <p className="fotobattle-fout">{fout}</p>}
    </div>
  );
}
