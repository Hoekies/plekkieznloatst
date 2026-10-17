// Geheim kenmerk waarmee de middleware laat zien dat híj de gebruikersgegevens in de request-headers
// heeft gezet. Zonder dit kenmerk vertrouwt lib/auth-server.ts die headers niet: dan zou iemand ze zelf
// kunnen meesturen op een pad waar de middleware niet draait.
// Werkt zowel in de middleware (edge) als op de server (Node): beide hebben Web Crypto.
let merk: Promise<string> | null = null;

export function middlewareMerk(): Promise<string> {
  merk ??= (async () => {
    const geheim = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
    const data = new TextEncoder().encode(`pointrush-middleware:${geheim}`);
    const hash = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, "0")).join("");
  })();
  return merk;
}

export const MERK_HEADER = "x-pr-merk";
