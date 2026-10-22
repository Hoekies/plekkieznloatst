import { createHmac, timingSafeEqual } from "crypto";

// Openbare link naar de gelopen route van één team (te delen via WhatsApp, zonder inloggen).
// De sleutel in de link is een handtekening over het sessie-id; zonder de geheime servercode
// is hij niet te raden of na te maken.
function sleutelVoor(sessieId: string): string {
  const geheim = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  return createHmac("sha256", geheim).update(`gelopen-route:${sessieId}`).digest("base64url").slice(0, 22);
}

export function deelUrl(sessieId: string): string {
  const site = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");
  return `${site}/gedeeld/${sessieId}?k=${sleutelVoor(sessieId)}`;
}

// 📸 Fotoalbum van een route: alle ingestuurde foto's op één pagina, ook te delen zonder inloggen
function albumSleutelVoor(routeId: string): string {
  const geheim = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  return createHmac("sha256", geheim).update(`fotoalbum:${routeId}`).digest("base64url").slice(0, 22);
}
export function albumUrl(routeId: string): string {
  const site = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");
  return `${site}/album/${routeId}?k=${albumSleutelVoor(routeId)}`;
}
export function geldigeAlbumSleutel(routeId: string, sleutel: string | undefined): boolean {
  if (!sleutel) return false;
  const a = Buffer.from(albumSleutelVoor(routeId));
  const b = Buffer.from(sleutel);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function geldigeSleutel(sessieId: string, sleutel: string | undefined): boolean {
  if (!sleutel) return false;
  const a = Buffer.from(sleutelVoor(sessieId));
  const b = Buffer.from(sleutel);
  return a.length === b.length && timingSafeEqual(a, b);
}
