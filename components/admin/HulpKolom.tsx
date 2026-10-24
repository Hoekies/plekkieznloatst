"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";

// 👆 Aanwijzen: een vetgedrukte knopnaam in de uitleg (bijv. "📢 Bericht sturen") zoeken op het scherm,
// op de tekst, de tooltip (data-tip/title) of de naam voor schermlezers (aria-label). Emoji en tekens tellen niet mee.
const normaliseer = (t: string | null | undefined) => (t ?? "").toLowerCase()
  .replace(/[\p{Extended_Pictographic}️‍]/gu, "").replace(/[+·…:"“”'‘’()]/g, " ").replace(/\s+/g, " ").trim();

function zoekOpScherm(tekst: string): HTMLElement | null {
  const doel = normaliseer(tekst);
  if (doel.length < 3) return null;
  let beste: HTMLElement | null = null, besteScore = Infinity;
  document.querySelectorAll<HTMLElement>("button, a, [role=button], summary, label, [data-tip], [aria-label]").forEach((el) => {
    if (el.closest(".hulp-kolom") || !el.getClientRects().length) return;
    for (const naam of [el.textContent, el.getAttribute("aria-label"), el.getAttribute("data-tip"), el.getAttribute("title")].map(normaliseer)) {
      if (!naam) continue;
      // Precies gelijk wint; anders bevat (niet in een groot blok met veel andere tekst)
      const score = naam === doel ? naam.length : naam.includes(doel) && naam.length <= doel.length * 2 + 12 ? 1000 + naam.length : Infinity;
      if (score < besteScore) { besteScore = score; beste = el; }
    }
  });
  return beste;
}

// ❓ Hulpkolom (alleen op de pc): een smalle kolom rechts met de uitleg uit de handleiding bij de pagina
// waar je zit. Blijft open tijdens het wisselen van menu (de uitleg wisselt mee); open/dicht wordt onthouden.
// Knopnamen die op het scherm staan zijn aan te klikken: dan licht die knop op (👆 aanwijzen).
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

  // Welke vetgedrukte namen staan nu op het scherm? Die worden aanklikbaar. Opnieuw na laden en af en toe
  // (de pagina laadt soms later, of een venster gaat open).
  const tekstRef = useRef<HTMLDivElement>(null);
  const getoond = hulp?.pad === pad;
  useEffect(() => {
    if (!open || !getoond) return;
    const markeer = () => tekstRef.current?.querySelectorAll("strong").forEach((s) => {
      const op = !!zoekOpScherm(s.textContent ?? "");
      s.classList.toggle("hulp-wijsbaar", op);
      if (op) s.title = "Laat zien waar dit op het scherm staat"; else s.removeAttribute("title");
    });
    const t1 = setTimeout(markeer, 300);
    const t2 = setInterval(markeer, 2500);
    return () => { clearTimeout(t1); clearInterval(t2); };
  }, [open, getoond, pad]);

  function wijsAan(e: React.MouseEvent) {
    const sterk = (e.target as HTMLElement).closest("strong");
    if (!sterk || !sterk.classList.contains("hulp-wijsbaar")) return;
    const el = zoekOpScherm(sterk.textContent ?? "");
    if (!el) return;
    el.scrollIntoView({ block: "center", behavior: "smooth" });
    el.classList.remove("hulp-aanwijs");
    void el.offsetWidth;  // animatie opnieuw starten bij nog een klik
    el.classList.add("hulp-aanwijs");
    setTimeout(() => el.classList.remove("hulp-aanwijs"), 3200);
  }

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
              ? <div ref={tekstRef} className="hulp-tekst" onClick={wijsAan} dangerouslySetInnerHTML={{ __html: hulp.html }} />
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
