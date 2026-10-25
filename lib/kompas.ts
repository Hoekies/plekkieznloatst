// 🧭 Kompas van de telefoon. De iPhone geeft de richting pas na toestemming, en die mag alleen gevraagd worden
// direct na een tik. Daarom vragen we het bij knoppen die de speler toch al indrukt (OK begrepen, Op pad).
// Android heeft geen toestemming nodig. Geeft true als het mag (of er niets te vragen valt).
export async function vraagKompas(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  const D = (window as unknown as { DeviceOrientationEvent?: { requestPermission?: () => Promise<string> } }).DeviceOrientationEvent;
  if (!D?.requestPermission) return true;
  try { return (await D.requestPermission()) === "granted"; } catch { return false; }
}
