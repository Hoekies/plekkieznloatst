"use client";

import { useState, useEffect } from "react";

export default function SidebarToggle() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    function sluit(e: MouseEvent) {
      const sidebar = document.querySelector(".admin-sidebar");
      if (sidebar && !sidebar.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", sluit);
    return () => document.removeEventListener("mousedown", sluit);
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
