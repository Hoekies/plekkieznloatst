// Afbeeldingen en bestanden maken en delen (oorkonde, uitslag, inlogkaartjes, rapport, voorproefje)

// Tekst bruikbaar maken als bestandsnaam ("Team Turbo!" → "Team-Turbo-")
export function bestandsnaamDeel(tekst: string): string {
  return tekst.replace(/[^\p{L}\p{N}]+/gu, "-");
}

// Een HTML-element als PNG-bestand. Wacht eerst op de lettertypen en de afbeeldingen erin.
export async function elementNaarPng(el: HTMLElement, naam: string, schaal = 2): Promise<File | null> {
  const { default: html2canvas } = await import("html2canvas-pro");
  await document.fonts?.ready;
  await Promise.all([...el.querySelectorAll("img")].map((img) => img.decode().catch(() => undefined)));
  const canvas = await html2canvas(el, { scale: schaal, backgroundColor: null, logging: false, useCORS: true });
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/png"));
  return blob ? new File([blob], naam, { type: "image/png" }) : null;
}

// Bestand opslaan op het apparaat
export function downloadBestand(f: File) {
  const url = URL.createObjectURL(f);
  const a = document.createElement("a");
  a.href = url; a.download = f.name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

// Delen via het deelmenu van de telefoon; kan dat niet (bijv. Firefox), dan downloaden.
// Geeft terug wat er gebeurde, zodat de aanroeper bij "gedownload" nog iets kan doen (WhatsApp openen).
export async function deelOfDownload(f: File, tekst?: string): Promise<"gedeeld" | "geannuleerd" | "gedownload"> {
  if (navigator.canShare?.({ files: [f] })) {
    try {
      await navigator.share({ files: [f], text: tekst });
      return "gedeeld";
    } catch (e) {
      if ((e as Error).name === "AbortError") return "geannuleerd";
    }
  }
  downloadBestand(f);
  return "gedownload";
}
