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
      if (sidebar && !sidebar.contains(e.target as Node)) setOpen(false);
    }
    // Een menu-item gekozen (ook de pagina waar je al bent, of een knop die een venster opent): menu dicht
    function kies(e: Event) {
      if ((e.target as HTMLElement).closest(".admin-nav-link")) setOpen(false);
    }
    document.addEventListener("mousedown", sluit);
    sidebar?.addEventListener("click", kies);
    return () => {
      document.removeEventListener("mousedown", sluit);
      sidebar?.removeEventListener("click", kies);
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
