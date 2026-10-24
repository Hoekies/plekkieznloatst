// Plaatjes in public/ die we zelf vervangen (instructiekaarten): met het bouwmoment erachter in het adres.
// De browser bewaart ze een dag; zo haalt hij na een nieuwe versie van de app meteen de nieuwe op.
const V = (process.env.NEXT_PUBLIC_BOUWDATUM ?? "").replace(/\D/g, "").slice(0, 12);
export const metVersie = (src: string) => (V ? `${src}?v=${V}` : src);
