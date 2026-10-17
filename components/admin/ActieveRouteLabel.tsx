"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

// Bovenin het menu: welke route er nu actief is (of dat er geen is)
export default function ActieveRouteLabel() {
  const [naam, setNaam] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    let actief = true;
    async function laad() {
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
    // Eigen kaartje bovenin het menu: kopje met een pulserend bolletje, de naam groot (mag over twee regels)
    <Link href="/admin/routes" className={`admin-menu-route${naam ? "" : " admin-menu-route--geen"}`} title="Naar de routes">
      <span className="admin-menu-route-kop">
        <span className="admin-menu-route-stip" aria-hidden />
        {naam ? "Actieve route" : "Geen actieve route"}
      </span>
      <span className="admin-menu-route-naam">{naam ?? "Kies een route ›"}</span>
    </Link>
  );
}
