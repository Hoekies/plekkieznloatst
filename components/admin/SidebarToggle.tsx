"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";

export default function SidebarToggle() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Naar een andere pagina: menu dicht, zodat de pagina zichtbaar is
  useEffect(() => { setOpen(false); }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const sidebar = document.querySelector(".admin-sidebar");
    function sluit(e: MouseEvent) {
      // Het uitklappaneel van ⚙️ Instellingen staat naast het menu: daar tikken laat het menu open
      if (sidebar && !sidebar.contains(e.target as Node) && !(e.target as HTMLElement).closest?.(".menu-groep-uitklap")) setOpen(false);
    }
    // Een menu-item gekozen (ook de pagina waar je al bent, of een knop die een venster opent): menu dicht.
    // Niet bij Inklappen (dan wordt het menu een iconenbalk) en niet bij het openen van ⚙️ Instellingen.
    function kies(e: Event) {
      const t = e.target as HTMLElement;
      if (t.closest(".menu-inklap, .menu-groep-kop")) return;
      if (t.closest(".admin-nav-link") && (sidebar?.contains(t) || t.closest(".menu-groep-uitklap"))) setOpen(false);
    }
    document.addEventListener("mousedown", sluit);
    document.addEventListener("click", kies);
    return () => {
      document.removeEventListener("mousedown", sluit);
      document.removeEventListener("click", kies);
    };
  }, [open]);

  useEffect(() => {
    const sidebar = document.querySelector(".admin-sidebar");
    if (!sidebar) return;
    if (open) {
      sidebar.classList.add("admin-sidebar--open");
    } else {
      sidebar.classList.remove("admin-sidebar--open");
    }
  }, [open]);

  return (
    <button
      className="admin-hamburger"
      aria-label="Menu"
      onClick={() => setOpen((v) => !v)}
    >
      <span />
      <span />
      <span />
    </button>
  );
}
