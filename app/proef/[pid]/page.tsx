"use client";

import { useEffect, useState } from "react";
import VraagPopup, { type VraagData } from "@/components/speler/VraagPopup";
import { beoordeel } from "@/lib/vraag-proef";
import type { RoutePunt } from "@/types/database";

// 🧪 Proefversie van één vraag op de telefoon (QR-code uit de vraag-editor): precies zoals de speler hem krijgt,
// met goed/fout en uitleg. Niets wordt opgeslagen; inloggen, een actieve route of de volgorde maakt niet uit.
export default function ProefPagina({ params, searchParams }: { params: { pid: string }; searchParams: { s?: string } }) {
  const [data, setData] = useState<{ punt: RoutePunt; vraag: VraagData | null } | null>(null);
  const [fout, setFout] = useState<string | null>(null);
  const [ronde, setRonde] = useState(0);
  const [klaar, setKlaar] = useState(false);

  useEffect(() => {
    fetch(`/api/proef/${params.pid}?s=${encodeURIComponent(searchParams.s ?? "")}`, { cache: "no-store" })
      .then(async (r) => { const d = await r.json().catch(() => ({})); if (!r.ok) setFout(d.fout ?? "Deze QR-code werkt niet"); else setData(d); })
      .catch(() => setFout("Geen verbinding"));
  }, [params.pid, searchParams.s]);

  return (
    <div className="pr-stage proef-pagina">
      <div className="proef-kop">🧪 Proef · {data?.punt.name ?? "vraag"} · er wordt niets opgeslagen</div>
      {fout && <div className="proef-melding-fout">{fout}</div>}
      {data && !klaar && (
        <VraagPopup key={ronde} punt={data.punt}
          proef={{ haalVraag: () => Promise.resolve(data.vraag), beoordeel }}
          onVerwerkt={() => setKlaar(true)} />
      )}
      {data && klaar && (
        <div className="proef-klaar">
          <div style={{ fontSize: "2.4rem" }}>✅</div>
          <div className="proef-klaar-titel">Proef klaar</div>
          <button type="button" className="btn-premium--compact" onClick={() => { setKlaar(false); setRonde((n) => n + 1); }}>🔁 Nog een keer</button>
          {/* Echt ontgrendelen voor een testteam dat aan het spelen is (telt wél mee) */}
          <a className="proef-echt" href={`/speler/qr?p=${params.pid}&s=${encodeURIComponent(searchParams.s ?? "")}`}>Als ingelogd testteam dit punt echt openen →</a>
        </div>
      )}
    </div>
  );
}
