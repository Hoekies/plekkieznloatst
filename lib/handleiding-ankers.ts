// 🔗 Ankers in de handleiding: elke kop krijgt een vaste id (zoals "het-spel-starten"), zodat een link als
// [Het spel starten](#het-spel-starten) ook echt ergens heen gaat, op de pagina Info & uitleg én in de hulpkolom.

export function ankerVan(kop: string): string {
  return kop.toLowerCase()
    .replace(/<[^>]+>/g, "")
    .replace(/&[a-z#0-9]+;/g, "")
    .replace(/[\p{Extended_Pictographic}️‍]/gu, "")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

// Koppen in gewone HTML (pagina Info & uitleg) een id geven
export function koppenMetAnker(html: string): string {
  return html.replace(/<h([1-6])>([\s\S]*?)<\/h\1>/g, (_, n: string, inhoud: string) => `<h${n} id="${ankerVan(inhoud)}">${inhoud}</h${n}>`);
}

// Links naar een kop die niet in dit stuk staat (hulpkolom: alleen een deel van de handleiding): naar de volledige
// handleiding, in een nieuw tabblad, zodat niet-opgeslagen werk in de editor blijft staan
export function losseAnkersNaarHandleiding(html: string): string {
  return html.replace(/href="#([^"]+)"/g, (heel, id: string) =>
    html.includes(`id="${id}"`) ? heel : `href="/admin/uitleg#${id}" target="_blank" rel="noopener"`);
}
