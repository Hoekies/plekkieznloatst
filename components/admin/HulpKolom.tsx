"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import LaadBlokjes from "@/components/shared/LaadBlokjes";
import Icoon from "@/components/admin/Icoon";
import { openInfo } from "@/components/admin/InfoKnop";
import { hulpNamen, normaliseerNaam as normaliseer } from "@/lib/hulp-namen";

// 👆 Aanwijzen: een vetgedrukte knopnaam in de uitleg (bijv. "📢 Bericht sturen") zoeken op het scherm,
// op de tekst, de tooltip (data-tip/title) of de naam voor schermlezers (aria-label). Emoji en tekens tellen niet mee.
// "A / B" zijn twee namen: de eerste die op het scherm staat wint (dezelfde regel als de zelftest, lib/hulp-namen.ts).
// Staat er een venster open (vraag-editor, Alle vragen, een dialoog), dan eerst daarin zoeken; en een knop in het
// hoofdmenu verliest van een gelijknamige knop op de pagina zelf (bijv. ⚙️ Instellingen in de editor).
function zoekOpScherm(tekst: string): HTMLElement | null {
  const vensters = [...document.querySelectorAll<HTMLElement>("[data-vraagvenster], [role=dialog]")].filter((v) => !v.closest(".hulp-kolom") && v.getClientRects().length);
  const bereik: ParentNode = vensters[vensters.length - 1] ?? document;
  for (const doel of hulpNamen(tekst)) {
    let beste: HTMLElement | null = null, besteScore = Infinity;
    bereik.querySelectorAll<HTMLElement>("button, a, [role=button], summary, label, [data-tip], [aria-label]").forEach((el) => {
      if (el.closest(".hulp-kolom") || !el.getClientRects().length) return;
      // Onzichtbaar (visibility: hidden) telt niet als "op het scherm"
      if (getComputedStyle(el).visibility === "hidden") return;
      const inMenu = !!el.closest(".admin-sidebar, .admin-nav, nav");
      for (const naam of [el.textContent, el.getAttribute("aria-label"), el.getAttribute("data-tip"), el.getAttribute("title")].map(normaliseer)) {
        if (!naam) continue;
        // Precies gelijk wint; anders bevat (niet in een groot blok met veel andere tekst)
        const score = (naam === doel ? naam.length : naam.includes(doel) && naam.length <= doel.length * 2 + 12 ? 1000 + naam.length : Infinity) + (inMenu ? 500 : 0);
        if (score < besteScore) { besteScore = score; beste = el; }
      }
    });
    if (beste) return beste;
  }
  return null;
}

// Het onderdeel van de editor waar je nu bent (de editor zet het op <html data-hulp="…">)
function useHulpOnderdeel(): string {
  const [onderdeel, setOnderdeel] = useState("");
  useEffect(() => {
    const lees = () => setOnderdeel(document.documentElement.dataset.hulp ?? "");
    lees();
    const kijker = new MutationObserver(lees);
    kijker.observe(document.documentElement, { attributes: true, attributeFilter: ["data-hulp"] });
    return () => kijker.disconnect();
  }, []);
  return onderdeel;
}

// ❓ Hulpkolom: een smalle kolom rechts met de uitleg uit de handleiding bij de pagina waar je zit, en in de
// editor bovenaan de uitleg bij het onderdeel waar je bent (vraag, punt, items, …). Blijft open tijdens het
// wisselen van menu (de uitleg wisselt mee); open/dicht wordt onthouden. Knopnamen die op het scherm staan zijn
// aan te klikken (of met Tab en Enter): dan licht die knop op (👆 aanwijzen).
// Breed scherm: een kolom naast de pagina. Kleinere laptop: een paneel dat over de pagina schuift (de editor
// houdt zijn ruimte). Telefoon: in de editor een eigen ?-knop rechtsonder.
export default function HulpKolom() {
  const pad = usePathname();
  const onderdeel = useHulpOnderdeel();
  const sleutel = `${pad}|${onderdeel}`;
  const [open, setOpen] = useState(false);
  const [klaar, setKlaar] = useState(false);
  const [hulp, setHulp] = useState<{ sleutel: string; titel: string; html: string } | null>(null);

  useEffect(() => { setKlaar(true); try { setOpen(localStorage.getItem("pr_hulp_open") === "1"); } catch { /* geen opslag */ } }, []);
  function wissel() {
    setOpen((o) => { try { localStorage.setItem("pr_hulp_open", o ? "0" : "1"); } catch { /* geen opslag */ } return !o; });
  }

  // De pagina maakt ruimte voor de kolom (alleen op een breed scherm, zie CSS)
  useEffect(() => {
    document.documentElement.classList.toggle("hulp-open", open);
    return () => document.documentElement.classList.remove("hulp-open");
  }, [open]);

  // Welke vetgedrukte namen staan nu op het scherm? Die worden aanklikbaar. Opnieuw na laden en af en toe
  // (de pagina laadt soms later, of een venster gaat open).
  const tekstRef = useRef<HTMLDivElement>(null);
  const getoond = hulp?.sleutel === sleutel;
  useEffect(() => {
    if (!open || !getoond) return;
    const markeer = () => tekstRef.current?.querySelectorAll("strong").forEach((s) => {
      const op = !!zoekOpScherm(s.textContent ?? "");
      s.classList.toggle("hulp-wijsbaar", op);
      // Ook met het toetsenbord te gebruiken: Tab ernaartoe, Enter of spatie wijst aan
      if (op) {
        s.title = "Laat zien waar dit op het scherm staat";
        s.tabIndex = 0; s.setAttribute("role", "button");
        s.setAttribute("aria-label", `Wijs ${(s.textContent ?? "").trim()} aan`);
      } else {
        s.removeAttribute("title"); s.removeAttribute("tabindex"); s.removeAttribute("role"); s.removeAttribute("aria-label");
      }
    });
    const t1 = setTimeout(markeer, 300);
    const t2 = setInterval(markeer, 2500);
    return () => { clearTimeout(t1); clearInterval(t2); };
  }, [open, getoond, sleutel]);

  function wijsAan(e: React.MouseEvent | React.KeyboardEvent) {
    if ("key" in e && e.key !== "Enter" && e.key !== " ") return;
    const sterk = (e.target as HTMLElement).closest("strong");
    if (!sterk || !sterk.classList.contains("hulp-wijsbaar")) return;
    e.preventDefault();
    const el = zoekOpScherm(sterk.textContent ?? "");
    if (!el) return;
    // Bij "minder beweging" direct, zonder vloeiend scrollen
    const rustig = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ block: "center", behavior: rustig ? "auto" : "smooth" });
    el.classList.remove("hulp-aanwijs");
    void el.offsetWidth;  // animatie opnieuw starten bij nog een klik
    el.classList.add("hulp-aanwijs");
    setTimeout(() => el.classList.remove("hulp-aanwijs"), 3200);
  }

  // Uitleg bij deze pagina en dit onderdeel ophalen. Een mislukte poging wordt niet onthouden: dan een melding
  // met "Opnieuw proberen" (anders bleef de foutmelding staan tot je een andere pagina opende).
  const [laadFout, setLaadFout] = useState(false);
  const [poging, setPoging] = useState(0);
  useEffect(() => {
    if (!open || hulp?.sleutel === sleutel) return;
    let weg = false;
    setLaadFout(false);
    fetch(`/api/admin/uitleg?pad=${encodeURIComponent(pad)}&onderdeel=${encodeURIComponent(onderdeel)}`)
      .then(async (r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((d) => { if (!weg) setHulp({ sleutel, titel: d?.titel ?? "Hulp", html: d?.html ?? "" }); })
      .catch(() => { if (!weg) setLaadFout(true); });
    return () => { weg = true; };
  }, [open, pad, onderdeel, sleutel, hulp?.sleutel, poging]);

  // In de editor op de telefoon: een eigen ?-knop (de kopknoppen staan daar niet)
  const editor = pad.startsWith("/admin/routes/");

  return (
    <>
      <button type="button" className={`btn btn-outline header-knop info-knop hulp-knop${open ? " hulp-knop--aan" : ""}`} onClick={wissel}
        data-tip={open ? "Hulp sluiten (?)" : "Hulp bij deze pagina (?)"} data-tip-pos="onder" aria-label="Hulp bij deze pagina" aria-expanded={open} data-sneltoets="?">
        <Icoon naam="vraag" />
      </button>
      {/* Buiten de kop gezet (portal), zodat de hulp ook boven een open vraagvenster en op de telefoon te zien is */}
      {klaar && createPortal(
        <>
          {editor && !open && (
            <button type="button" className="hulp-knop-mobiel" onClick={wissel} aria-label="Hulp bij dit onderdeel"><Icoon naam="vraag" /></button>
          )}
          {open && (
            <aside className="hulp-kolom" aria-label="Hulp bij deze pagina">
              <div className="hulp-kolom-kop">
                <span className="hulp-kolom-titel">❓ Hulp · {getoond ? hulp!.titel : "…"}</span>
                <button type="button" className="editor-paneel-sluit" onClick={wissel} aria-label="Hulp sluiten">✕</button>
              </div>
              <div className="hulp-kolom-inhoud">
                {getoond
                  // Eigen bestand uit de repository (de handleiding), geen invoer van gebruikers
                  ? <div ref={tekstRef} className="hulp-tekst" onClick={wijsAan} onKeyDown={wijsAan} dangerouslySetInnerHTML={{ __html: hulp!.html }} />
                  : laadFout
                  ? <div className="hulp-fout">De uitleg kon niet geladen worden. <button type="button" className="rl-knop" onClick={() => setPoging((n) => n + 1)}><Icoon naam="vernieuwen" /> Opnieuw proberen</button></div>
                  : <LaadBlokjes aantal={4} hoogte={44} gap={8} />}
              </div>
              <div className="hulp-kolom-voet">
                {/* In een nieuw tabblad: niet-opgeslagen werk in de editor blijft staan */}
                <a href="/admin/beginnen" target="_blank" rel="noopener"><Icoon naam="kompas" /> Snel aan de slag</a>
                <a href="/admin/uitleg" target="_blank" rel="noopener"><Icoon naam="handleiding" /> Volledige handleiding</a>
                {/* Wat eerst onder Info & uitleg in het menu stond: instructiekaarten (printen) en Ko-fi */}
                <button type="button" onClick={openInfo}><Icoon naam="spelerskaart" /> Instructiekaarten en info</button>
              </div>
            </aside>
          )}
        </>,
        document.body,
      )}
    </>
  );
}
