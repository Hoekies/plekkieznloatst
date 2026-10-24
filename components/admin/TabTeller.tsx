"use client";

import { useEffect, useRef } from "react";
import { useBeheerStatus } from "@/components/admin/useBeheerStatus";

// 🔢 Titel van het browsertabblad: "(3) PointRush" zolang er hulpvragen open staan of foto's op keuring
// wachten, en bij een hulpvraag knipperend "⚠️ (1) Hulp nodig!". Zo zie je het ook in een ander tabblad.
// De titel zelf zet elke pagina; hier komt alleen het getal (of de knipper) ervoor.
export default function TabTeller() {
  const { hulp, live } = useBeheerStatus();
  const n = hulp.length + (live?.wachtende_fotos ?? 0);
  const basisRef = useRef("");

  useEffect(() => {
    const onze = /^(\(\d+\) |⚠️ \(\d+\) Hulp nodig!$)/;
    const basis = () => {
      if (!onze.test(document.title)) basisRef.current = document.title;
      return basisRef.current || document.title.replace(/^\(\d+\) /, "");
    };
    const zet = (knipper: boolean) => {
      const b = basis();
      document.title = knipper ? `⚠️ (${hulp.length}) Hulp nodig!` : n ? `(${n}) ${b}` : b;
    };
    zet(false);
    if (!hulp.length) {
      // Nieuwe pagina (andere titel): het getal er opnieuw voor zetten
      const t = setInterval(() => zet(false), 2000);
      return () => { clearInterval(t); document.title = basis(); };
    }
    let aan = false;
    const t = setInterval(() => { aan = !aan; zet(aan); }, 1000);
    return () => { clearInterval(t); document.title = basis(); };
  }, [n, hulp.length]);

  return null;
}
