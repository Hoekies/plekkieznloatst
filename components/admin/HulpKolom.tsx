"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";

// ❓ Hulpkolom (alleen op de pc): een smalle kolom rechts met de uitleg uit de handleiding bij de pagina
// waar je zit. Blijft open tijdens het wisselen van menu (de uitleg wisselt mee); open/dicht wordt onthouden.
export default function HulpKolom() {
  const pad = usePathname();
  const [open, setOpen] = useState(false);
  const [hulp, setHulp] = useState<{ pad: string; titel: string; html: string } | null>(null);

  useEffect(() => { try { setOpen(localStorage.getItem("pr_hulp_open") === "1"); } catch { /* geen opslag */ } }, []);
  function wissel() {
    setOpen((o) => { try { localStorage.setItem("pr_hulp_open", o ? "0" : "1"); } catch { /* geen opslag */ } return !o; });
  }

  // De pagina maakt ruimte voor de kolom
  useEffect(() => {
    document.documentElement.classList.toggle("hulp-open", open);
    return () => document.documentElement.classList.remove("hulp-open");
  }, [open]);

  // Uitleg bij deze pagina ophalen (opnieuw bij een andere pagina)
  useEffect(() => {
    if (!open || hulp?.pad === pad) return;
    let weg = false;
    fetch(`/api/admin/uitleg?pad=${encodeURIComponent(pad)}`).then((r) => r.json()).catch(() => null).then((d) => {
      if (!weg) setHulp({ pad, titel: d?.titel ?? "Hulp", html: d?.html ?? `<p>${d?.fout ?? "De uitleg kon niet geladen worden."}</p>` });
    });
    return () => { weg = true; };
  }, [open, pad, hulp?.pad]);

  return (
    <>
      <button type="button" className={`btn btn-outline header-knop info-knop hulp-knop${open ? " hulp-knop--aan" : ""}`} onClick={wissel}
        data-tip={open ? "Hulp sluiten" : "Hulp bij deze pagina"} data-tip-pos="onder" aria-label="Hulp bij deze pagina" aria-expanded={open}>
        <span className="header-knop-icoon" aria-hidden>❓</span>
      </button>
      {open && (
        <aside className="hulp-kolom" aria-label="Hulp bij deze pagina">
          <div className="hulp-kolom-kop">
            <span className="hulp-kolom-titel">❓ Hulp · {hulp?.pad === pad ? hulp.titel : "…"}</span>
            <button type="button" className="editor-paneel-sluit" onClick={wissel} aria-label="Hulp sluiten">✕</button>
          </div>
          <div className="hulp-kolom-inhoud">
            {hulp?.pad === pad
              // Eigen bestand uit de repository (de handleiding), geen invoer van gebruikers
              ? <div className="hulp-tekst" dangerouslySetInnerHTML={{ __html: hulp.html }} />
              : <p className="hulp-laden">Uitleg laden…</p>}
          </div>
          <div className="hulp-kolom-voet">
            <Link href="/admin/beginnen">🧭 Snel aan de slag</Link>
            <Link href="/admin/uitleg">📖 Volledige handleiding</Link>
          </div>
        </aside>
      )}
    </>
  );
}
