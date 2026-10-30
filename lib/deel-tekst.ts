"use client";

import { waLink } from "@/lib/telefoon";

// 💬 Een tekst delen via WhatsApp (spelstatistieken, uitslag). Op de telefoon opent WhatsApp meteen met de tekst.
// Op de computer maakt een wa.me-link van emoji's soms vraagtekens: daarom staat de tekst daar ook op het klembord,
// zodat je hem met Ctrl+V kunt plakken. Geeft terug wat er gebeurde, voor de melding.
export async function deelViaWhatsApp(tekst: string): Promise<"geopend" | "gekopieerd"> {
  const computer = !/Android|iPhone|iPad|iPod/i.test(navigator.userAgent) && window.matchMedia("(pointer: fine)").matches;
  let gekopieerd = false;
  if (computer) {
    try { await navigator.clipboard.writeText(tekst); gekopieerd = true; } catch { /* klembord niet toegestaan */ }
  }
  window.open(waLink(tekst), "_blank");
  return gekopieerd ? "gekopieerd" : "geopend";
}
