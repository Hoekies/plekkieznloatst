// Telefoonnummers van teams (migratie 009). Opgeslagen als +31612345678.

// "06 12 34 56 78", "+31 6-1234 5678", "0031612345678" → "+31612345678"; null als het geen nummer is
export function normaliseerTelefoon(invoer: string): string | null {
  let s = invoer.replace(/[\s\-().]/g, "");
  if (!s) return null;
  if (s.startsWith("00")) s = `+${s.slice(2)}`;
  else if (s.startsWith("0")) s = `+31${s.slice(1)}`;
  else if (!s.startsWith("+")) s = `+${s}`;
  return /^\+\d{8,15}$/.test(s) ? s : null;
}

// Alleen cijfers, zoals wa.me ze wil
function waNummer(telefoon: string): string {
  return telefoon.replace(/\D/g, "");
}

// Leesbaar: +31612345678 → 06 12 34 56 78 (andere landen ongewijzigd)
export function toonTelefoon(telefoon: string): string {
  const m = /^\+31(6)(\d{8})$/.exec(telefoon);
  return m ? `0${m[1]} ${m[2].replace(/(\d{2})(?=\d)/g, "$1 ")}` : telefoon;
}

// WhatsApp-link: met nummer meteen naar die chat, zonder nummer kies je zelf
export function waLink(tekst: string, telefoon?: string | null): string {
  const basis = `https://wa.me/${telefoon ? waNummer(telefoon) : ""}`;
  return tekst ? `${basis}?text=${encodeURIComponent(tekst)}` : basis;
}
