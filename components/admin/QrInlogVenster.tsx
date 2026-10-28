"use client";

import { useEffect, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { VensterMetKop } from "@/components/shared/Venster";
import { uitlegBijStatus } from "@/lib/fout-uitleg";
import { tijdTekst } from "@/components/admin/InlogLink";
import Icoon from "@/components/admin/Icoon";

// 📱 QR om in te loggen: een grote QR-code op het scherm, die de speler met zijn telefoon scant en dan meteen
// is ingelogd (een inloglink, 12 uur geldig). Handig aan de start: telefoon erbij, scannen, klaar.
// Speelt dit team al op een andere telefoon, dan neemt de telefoon die scant het over (app/l/[code]/route.ts).
export default function QrInlogVenster({ spelerId, naam, icoon, anderApparaat, onSluit }: {
  spelerId: string; naam: string; icoon: string | null; anderApparaat: boolean; onSluit: () => void;
}) {
  const [link, setLink] = useState<{ url: string; geldig_tot: string } | null>(null);
  const [fout, setFout] = useState("");
  const [poging, setPoging] = useState(0);

  useEffect(() => {
    let weg = false;
    setFout(""); setLink(null);
    fetch(`/api/admin/groepen/${spelerId}/link`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ uren: 12 }) })
      .then(async (r) => {
        const d = await r.json().catch(() => ({}));
        if (weg) return;
        if (!r.ok) setFout(uitlegBijStatus(r.status, "QR-code maken", d.fout));
        else setLink({ url: d.url, geldig_tot: d.geldig_tot });
      })
      .catch(() => { if (!weg) setFout("Geen verbinding: de QR-code kon niet gemaakt worden"); });
    return () => { weg = true; };
  }, [spelerId, poging]);

  return (
    <VensterMetKop icoon={icoon ?? "📱"} label="QR om in te loggen" titel={naam} onSluit={onSluit} breedte={460} maxHoogte={94}>
      <div className="qr-inlog">
        {link ? (
          <>
            <div className="qr-inlog-code"><QRCodeCanvas value={link.url} size={300} marginSize={2} style={{ width: "100%", height: "auto" }} /></div>
            <p className="qr-inlog-uitleg">📷 Scan met de camera van de telefoon: je bent meteen ingelogd als <strong>{naam}</strong>. Geldig tot {tijdTekst(link.geldig_tot)}.</p>
            {anderApparaat && <p className="qr-inlog-let-op">⚠️ Dit team is al ingelogd op een andere telefoon. Wie nu scant, neemt het team over: die andere telefoon wordt uitgelogd.</p>}
          </>
        ) : fout ? (
          <div className="qr-inlog-fout">{fout}<button type="button" className="rl-knop" onClick={() => setPoging((n) => n + 1)}><Icoon naam="vernieuwen" /> Opnieuw proberen</button></div>
        ) : (
          <div className="qr-inlog-laden"><div className="spinner" /></div>
        )}
      </div>
    </VensterMetKop>
  );
}
