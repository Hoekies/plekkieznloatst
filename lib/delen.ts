// Afbeeldingen en bestanden maken en delen (oorkonde, uitslag, inlogkaartjes, rapport, voorproefje)

// Tekst bruikbaar maken als bestandsnaam ("Team Turbo!" → "Team-Turbo-")
export function bestandsnaamDeel(tekst: string): string {
  return tekst.replace(/[^\p{L}\p{N}]+/gu, "-");
}

// Een HTML-element als PNG-bestand. Wacht eerst op de lettertypen en de afbeeldingen erin.
// Afbeeldingen van een ander adres (teamfoto's en logo's uit Supabase) eerst zelf ophalen en tijdelijk als
// data-link in het element zetten: staat dezelfde foto al ergens op de pagina (zonder crossOrigin), dan geeft
// de browser anders de bewaarde versie terug en laat html2canvas de foto stil weg (lege cirkel). Een data-link
// (geen blob-link) werkt ook in Safari binnen de kopie die html2canvas maakt.
export async function elementNaarPng(el: HTMLElement, naam: string, schaal = 2): Promise<File | null> {
  const { default: html2canvas } = await import("html2canvas-pro");
  await document.fonts?.ready;
  const terug: (() => void)[] = [];
  await Promise.all([...el.querySelectorAll("img")].map(async (img) => {
    const src = img.currentSrc || img.src;
    if (src && /^https?:/.test(src) && new URL(src).origin !== location.origin) {
      try {
        const res = await fetch(src, { cache: "no-store" });
        if (res.ok) {
          const blob = await res.blob();
          const dataUrl = await new Promise<string>((ok, nee) => {
            const lezer = new FileReader();
            lezer.onload = () => ok(String(lezer.result));
            lezer.onerror = () => nee(lezer.error);
            lezer.readAsDataURL(blob);
          });
          img.removeAttribute("crossorigin");
          img.src = dataUrl;
          terug.push(() => { img.crossOrigin = "anonymous"; img.src = src; });
        }
      } catch { /* dan de gewone link */ }
    }
    await img.decode().catch(() => undefined);
  }));
  try {
    const canvas = await html2canvas(el, { scale: schaal, backgroundColor: null, logging: false, useCORS: true });
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/png"));
    return blob ? new File([blob], naam, { type: "image/png" }) : null;
  } finally {
    terug.forEach((f) => f());
  }
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

// Meerdere plaatjes in één keer delen (bijv. in één bericht in de groepsapp); kan het toestel dat niet,
// dan worden ze één voor één gedownload
export async function deelOfDownloadMeer(bestanden: File[]): Promise<"gedeeld" | "geannuleerd" | "gedownload"> {
  if (bestanden.length === 1) return deelOfDownload(bestanden[0]);
  if (navigator.canShare?.({ files: bestanden })) {
    try {
      await navigator.share({ files: bestanden });
      return "gedeeld";
    } catch (e) {
      if ((e as Error).name === "AbortError") return "geannuleerd";
    }
  }
  for (const f of bestanden) { downloadBestand(f); await new Promise((r) => setTimeout(r, 400)); }
  return "gedownload";
}
