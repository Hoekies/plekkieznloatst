"use client";

import { useEffect, useState } from "react";

// Bovenin het telefoonmenu: welke route er nu actief is (of dat er geen is)
export default function ActieveRouteLabel() {
  const [naam, setNaam] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    let actief = true;
    async function laad() {
      // Alleen op de telefoon zichtbaar: op de computer niets ophalen
      if (!window.matchMedia("(max-width: 768px)").matches) return;
      try {
        const res = await fetch("/api/admin/routes");
        if (!res.ok) return;
        const routes: { name: string; is_active: boolean }[] = await res.json();
        if (actief) setNaam(routes.find((r) => r.is_active)?.name ?? null);
      } catch { /* verbindingsfout: laatste stand laten staan */ }
    }
    laad();
    const t = setInterval(laad, 30000);
    const zichtbaar = () => { if (document.visibilityState === "visible") laad(); };
    document.addEventListener("visibilitychange", zichtbaar);
    return () => { actief = false; clearInterval(t); document.removeEventListener("visibilitychange", zichtbaar); };
  }, []);

  if (naam === undefined) return null;
  return (
    <div className={`admin-menu-route${naam ? "" : " admin-menu-route--geen"}`}>
      <span aria-hidden>🗺️</span>
      <span className="admin-menu-route-naam">{naam ?? "Geen actieve route"}</span>
      {naam && <span className="admin-menu-route-chip">actief</span>}
    </div>
  );
}
