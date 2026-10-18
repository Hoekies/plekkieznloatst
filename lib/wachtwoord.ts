// Makkelijk te typen wachtwoorden: een woord en twee cijfers (minimaal 8 tekens).
// Ook in de browser te gebruiken, voor een voorstel in de wachtwoordvelden.
const WOORDEN = ["tijger", "banaan", "kompas", "piraat", "sterren", "vlinder", "olifant", "pinguin", "dolfijn", "raketje", "zeilboot", "kasteel", "draakje", "schatkist", "tulpen", "molentje"];

export function maakWachtwoord(): string {
  const woord = WOORDEN[Math.floor(Math.random() * WOORDEN.length)];
  return `${woord}${String(Math.floor(Math.random() * 90) + 10)}`;
}
