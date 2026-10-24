"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import UitklapPijl from "@/components/shared/UitklapPijl";

// ⚙️ Groep in het menu (bijv. Instellingen): in- en uitklapbaar, onthouden op dit toestel. Staat de pagina
// waar je bent in de groep, dan is hij vanzelf open.
export default function MenuGroep({ sleutel, icoon, titel, paden, children }: {
  sleutel: string; icoon: string; titel: string; paden: string[]; children: React.ReactNode;
}) {
  const pad = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => { try { setOpen(localStorage.getItem(`pr_menu_${sleutel}`) === "1"); } catch { /* geen opslag */ } }, [sleutel]);
  const hier = paden.some((p) => pad === p || pad.startsWith(p + "/"));
  const isOpen = open || hier;
  function wissel() {
    setOpen((o) => { try { localStorage.setItem(`pr_menu_${sleutel}`, o ? "0" : "1"); } catch { /* geen opslag */ } return !o; });
  }
  return (
    <div className={`menu-groep${isOpen ? " menu-groep--open" : ""}`}>
      <button type="button" className="admin-nav-link menu-groep-kop" onClick={wissel} aria-expanded={isOpen} title={titel}>
        <UitklapPijl open={isOpen} /><span aria-hidden>{icoon}</span> {titel}
      </button>
      {isOpen && <div className="menu-groep-lijst">{children}</div>}
    </div>
  );
}
