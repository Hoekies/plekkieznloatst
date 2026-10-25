"use client";

import { useEffect, useState } from "react";
import GroepenBeheer from "@/components/admin/GroepenBeheer";
import HelpersBeheer from "@/components/admin/HelpersBeheer";

// 👫 Spelers-pagina: bovenaan kiezen tussen de teams en de helpers (onthouden op dit toestel), zodat de
// helpers niet tussen de teams staan
export default function SpelersTabs() {
  const [tab, setTab] = useState<"teams" | "helpers">("teams");
  useEffect(() => { try { if (localStorage.getItem("pr_spelers_tab") === "helpers") setTab("helpers"); } catch { /* geen opslag */ } }, []);
  function kies(t: "teams" | "helpers") {
    setTab(t);
    try { localStorage.setItem("pr_spelers_tab", t); } catch { /* geen opslag */ }
  }
  return (
    <>
      <div className="segment spelers-tabs" role="tablist" aria-label="Teams of helpers">
        <button type="button" role="tab" aria-selected={tab === "teams"} className={tab === "teams" ? "aan" : ""} onClick={() => kies("teams")}>👫 Teams</button>
        <button type="button" role="tab" aria-selected={tab === "helpers"} className={tab === "helpers" ? "aan" : ""} onClick={() => kies("helpers")}>🦺 Helpers</button>
      </div>
      {tab === "teams" ? <GroepenBeheer /> : <HelpersBeheer />}
    </>
  );
}
