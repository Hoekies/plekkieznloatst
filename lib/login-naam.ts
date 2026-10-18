// Zet een login_name om naar het interne e-mailadres.
// Beide routes (aanmaken + inloggen) gebruiken dezelfde functie.
export function loginNaarEmail(naam: string): string {
  return naam.toLowerCase().replace(/[^a-z0-9]/g, "") + "@plekkiespeler.nl";
}

// Helpers van de spelleider loggen ook in met alleen een naam
export function helperNaarEmail(naam: string): string {
  return naam.toLowerCase().replace(/[^a-z0-9]/g, "") + "@plekkiehelper.nl";
}
