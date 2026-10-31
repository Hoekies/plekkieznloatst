"use client";

import { usePathname } from "next/navigation";
import MenuIcoon, { type MenuIcoonNaam } from "@/components/admin/MenuIcoon";

// 📱 Telefoon: de naam van de pagina in de bovenste balk (in plaats van het logo), zodat er geen tweede
// kopbalk met alleen een titel nodig is
const TITELS: [RegExp, MenuIcoonNaam, string][] = [
  [/^\/admin\/?$/, "dashboard", "Dashboard"],
  [/^\/admin\/groepen/, "spelers", "Spelers"],
  [/^\/admin\/antwoorden/, "antwoorden", "Antwoorden"],
  [/^\/admin\/live/, "live", "Live kaart"],
  [/^\/admin\/routes\/[^/]+\/voorproefje/, "voorproefje", "Voorproefje"],
  [/^\/admin\/routes\/[^/]+\/spiekbriefje/, "voorproefje", "Spiekbriefje"],
  [/^\/admin\/routes\/[^/]+/, "routes", "Route"],
  [/^\/admin\/routes/, "routes", "Routes"],
  [/^\/admin\/seizoenen/, "seizoenen", "Seizoenen"],
  [/^\/admin\/systeem/, "systeem", "Systeemcheck"],
  [/^\/admin\/uitleg/, "handleiding", "Handleiding"],
  [/^\/admin\/beginnen/, "beginnen", "Snel aan de slag"],
  [/^\/admin\/kaartjes/, "kaartjes", "Inlogkaartjes"],
];

export default function PaginaTitel() {
  const pad = usePathname();
  const hit = TITELS.find(([re]) => re.test(pad));
  if (!hit) return null;
  return <span className="mobiel-paginatitel"><MenuIcoon naam={hit[1]} />{hit[2]}</span>;
}
