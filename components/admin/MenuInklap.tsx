"use client";

import { useEffect, useState } from "react";

const KEY = "pr_menu_smal";

// Computer: het menu links inklappen tot een smalle balk met alleen icoontjes (meer ruimte voor de
// kaart en de editor). Onthouden per browser.
export default function MenuInklap() {
  const [smal, setSmal] = useState(false);

  useEffect(() => {
    let begin = false;
    try { begin = localStorage.getItem(KEY) === "1"; } catch { /* geen opslag */ }
    setSmal(begin);
  }, []);
  useEffect(() => {
    document.documentElement.classList.toggle("menu-smal", smal);
  }, [smal]);

  function wissel() {
    const nieuw = !smal;
    setSmal(nieuw);
    try { localStorage.setItem(KEY, nieuw ? "1" : "0"); } catch { /* geen opslag */ }
  }

  return (
    <button type="button" className="admin-nav-link menu-inklap" onClick={wissel} title={smal ? "Menu uitklappen" : "Menu inklappen"} aria-label={smal ? "Menu uitklappen" : "Menu inklappen"}>
      <span aria-hidden>{smal ? "»" : "«"}</span> Inklappen
    </button>
  );
}
