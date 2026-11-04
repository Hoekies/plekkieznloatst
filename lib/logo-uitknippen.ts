// ✂️ Logo uitknippen in de browser: de (effen) achtergrond vanaf de randen doorzichtig maken en de lege
// randen eraf halen. Gaten binnen het logo (zoals het wit in een letter O) blijven staan, want alleen wat met
// de rand verbonden is, telt als achtergrond. Een logo dat al transparant is, blijft zoals het is.
const TOLERANTIE = 60;   // kleurverschil met de achtergrond dat nog als achtergrond telt
const ZACHT = 45;        // daarboven: overgang naar ondoorzichtig (zachte randjes)
// Op een zwarte achtergrond veel nauwer: de donkere randen en een zwarte bom lijken daar sterk op, en mogen niet mee weg
const TOLERANTIE_DONKER = 14;
const ZACHT_DONKER = 20;

export async function knipLogoUit(bron: Blob, maxZijde = 600): Promise<Blob | null> {
  const beeld = await createImageBitmap(bron).catch(() => null);
  if (!beeld) return null;
  const schaal = Math.min(1, maxZijde / Math.max(beeld.width, beeld.height));
  const w = Math.max(1, Math.round(beeld.width * schaal)), h = Math.max(1, Math.round(beeld.height * schaal));
  const doek = document.createElement("canvas");
  doek.width = w; doek.height = h;
  const ctx = doek.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(beeld, 0, 0, w, h);
  const img = ctx.getImageData(0, 0, w, h);
  const p = img.data;

  // Achtergrondkleur: het gemiddelde van de (ondoorzichtige) randpixels
  let r = 0, g = 0, b = 0, n = 0, randTotaal = 0;
  const rand = (x: number, y: number) => { const i = (y * w + x) * 4; randTotaal++; if (p[i + 3] > 200) { r += p[i]; g += p[i + 1]; b += p[i + 2]; n++; } };
  for (let x = 0; x < w; x++) { rand(x, 0); rand(x, h - 1); }
  for (let y = 0; y < h; y++) { rand(0, y); rand(w - 1, y); }
  const afstand = (i: number) => n ? Math.hypot(p[i] - r / n, p[i + 1] - g / n, p[i + 2] - b / n) : Infinity;

  // Al transparant (de meeste randpixels zijn doorzichtig): niets wegsnijden, alleen de lege randen eraf
  const alTransparant = n < randTotaal / 2;

  // Delen van het logo die de rand raken, trekken het gemiddelde scheef: nog een keer, nu alleen met wat erop lijkt
  if (n && !alTransparant) {
    const [r0, g0, b0] = [r / n, g / n, b / n];
    let r2 = 0, g2 = 0, b2 = 0, n2 = 0;
    const opnieuw = (x: number, y: number) => { const i = (y * w + x) * 4; if (p[i + 3] > 200 && Math.hypot(p[i] - r0, p[i + 1] - g0, p[i + 2] - b0) <= TOLERANTIE) { r2 += p[i]; g2 += p[i + 1]; b2 += p[i + 2]; n2++; } };
    for (let x = 0; x < w; x++) { opnieuw(x, 0); opnieuw(x, h - 1); }
    for (let y = 0; y < h; y++) { opnieuw(0, y); opnieuw(w - 1, y); }
    if (n2) { r = r2; g = g2; b = b2; n = n2; }
  }
  const donker = n > 0 && (r + g + b) / (3 * n) < 40;
  const marge = donker ? TOLERANTIE_DONKER : TOLERANTIE;
  const zacht = donker ? ZACHT_DONKER : ZACHT;

  // Is de rand wel effen? (bij een foto als logo niet: dan alleen de lege randen eraf)
  let afwijkend = 0;
  const telAfwijkend = (x: number, y: number) => { const i = (y * w + x) * 4; if (p[i + 3] > 200 && afstand(i) > TOLERANTIE) afwijkend++; };
  for (let x = 0; x < w; x++) { telAfwijkend(x, 0); telAfwijkend(x, h - 1); }
  for (let y = 0; y < h; y++) { telAfwijkend(0, y); telAfwijkend(w - 1, y); }
  const effen = !alTransparant && n > 0 && afwijkend / randTotaal < 0.3;

  // Vullen vanaf de rand: alles wat erop lijkt en eraan vastzit wordt doorzichtig
  if (effen) {
    const weg = new Uint8Array(w * h);
    const stapel: number[] = [];
    const probeer = (x: number, y: number) => {
      const k = y * w + x;
      if (weg[k]) return;
      const i = k * 4;
      if (p[i + 3] < 16 || afstand(i) <= marge) { weg[k] = 1; stapel.push(k); }
    };
    for (let x = 0; x < w; x++) { probeer(x, 0); probeer(x, h - 1); }
    for (let y = 0; y < h; y++) { probeer(0, y); probeer(w - 1, y); }
    while (stapel.length) {
      const k = stapel.pop()!, x = k % w, y = (k - x) / w;
      if (x > 0) probeer(x - 1, y);
      if (x < w - 1) probeer(x + 1, y);
      if (y > 0) probeer(x, y - 1);
      if (y < h - 1) probeer(x, y + 1);
    }
    for (let k = 0; k < w * h; k++) {
      const i = k * 4;
      if (weg[k]) { p[i + 3] = 0; continue; }
      // Rand van het logo (naast doorzichtig): zacht laten overlopen
      const x = k % w, y = (k - x) / w;
      const naastWeg = (x > 0 && weg[k - 1]) || (x < w - 1 && weg[k + 1]) || (y > 0 && weg[k - w]) || (y < h - 1 && weg[k + w]);
      if (naastWeg) {
        const d = afstand(i);
        if (d < marge + zacht) p[i + 3] = Math.round(p[i + 3] * Math.max(0, (d - marge) / zacht));
      }
    }
    ctx.putImageData(img, 0, 0);
  }

  // Lege randen eraf (met een paar pixels ruimte)
  let minX = w, minY = h, maxX = -1, maxY = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (p[(y * w + x) * 4 + 3] > 16) { if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; }
  }
  if (maxX < 0) return null;  // alles weg: dan klopt er iets niet
  const ruimte = 4;
  minX = Math.max(0, minX - ruimte); minY = Math.max(0, minY - ruimte);
  maxX = Math.min(w - 1, maxX + ruimte); maxY = Math.min(h - 1, maxY + ruimte);
  const uit = document.createElement("canvas");
  uit.width = maxX - minX + 1; uit.height = maxY - minY + 1;
  uit.getContext("2d")?.drawImage(doek, minX, minY, uit.width, uit.height, 0, 0, uit.width, uit.height);
  return new Promise((ok) => uit.toBlob(ok, "image/png"));
}
