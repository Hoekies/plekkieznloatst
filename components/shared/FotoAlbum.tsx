"use client";

import { useState } from "react";

export type AlbumFoto = { id: string; src: string; team: string; icoon: string | null; punt: string };

// 📸 Fotoalbum: alle foto's in een raster; tik op een foto om hem groot te zien (en verder te bladeren)
export default function FotoAlbum({ titel, fotos, nietBeschikbaar = false }: { titel: string; fotos: AlbumFoto[]; nietBeschikbaar?: boolean }) {
  const [groot, setGroot] = useState<number | null>(null);
  const huidig = groot !== null ? fotos[groot] : null;

  return (
    <div className="album">
      <header className="album-kop">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.webp" alt="PointRush" className="album-logo" />
        <div className="album-label">📸 Fotoalbum</div>
        <h1>{titel}</h1>
        {!nietBeschikbaar && <div className="album-aantal">{fotos.length} {fotos.length === 1 ? "foto" : "foto's"}</div>}
      </header>

      {nietBeschikbaar ? (
        <p className="album-leeg">De link klopt niet, of het spel is opgeruimd. Bedankt voor het spelen! 🍌</p>
      ) : fotos.length === 0 ? (
        <p className="album-leeg">Er zijn (nog) geen foto&apos;s ingestuurd.</p>
      ) : (
        <div className="album-raster">
          {fotos.map((f, i) => (
            <button key={f.id} type="button" className="album-foto" onClick={() => setGroot(i)} aria-label={`Foto van ${f.team} bij ${f.punt}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={f.src} alt="" loading="lazy" />
              <span className="album-onderschrift">{f.icoon ?? "👫"} {f.team}<small>{f.punt}</small></span>
            </button>
          ))}
        </div>
      )}

      {huidig && groot !== null && (
        <div className="album-groot" onClick={() => setGroot(null)} role="dialog" aria-label="Foto groot">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={huidig.src} alt="" onClick={(e) => e.stopPropagation()} />
          <div className="album-groot-onder" onClick={(e) => e.stopPropagation()}>
            <button type="button" disabled={groot === 0} onClick={() => setGroot(groot - 1)} aria-label="Vorige">‹</button>
            <span>{huidig.icoon ?? "👫"} {huidig.team} · {huidig.punt}</span>
            <button type="button" disabled={groot === fotos.length - 1} onClick={() => setGroot(groot + 1)} aria-label="Volgende">›</button>
          </div>
          <button type="button" className="album-sluit" onClick={() => setGroot(null)} aria-label="Sluiten">✕</button>
        </div>
      )}
    </div>
  );
}
