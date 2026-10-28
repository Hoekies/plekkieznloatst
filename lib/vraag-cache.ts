"use client";

// Vragen alvast ophalen (het volgende punt en de twee daarna), zodat een vraag ook zonder bereik opengaat.
// undefined = nog niet opgehaald, null = dit punt heeft geen vraag.
const cache = new Map<string, unknown | null>();

export async function haalVraag<T>(puntId: string): Promise<T | null> {
  if (cache.has(puntId)) return cache.get(puntId) as T | null;
  const res = await fetch(`/api/speler/vraag/${puntId}`);   // gooit een fout zonder bereik
  if (!res.ok) throw new Error(`vraag ${res.status}`);
  const data = await res.json() as T | null;
  cache.set(puntId, data);
  return data;
}

// Vergeten (één punt, of alles): na een wijziging door de organisatie de vraag opnieuw ophalen
export function wisVraagCache(puntId?: string) {
  if (puntId) cache.delete(puntId); else cache.clear();
}

export function laadVragenVooruit(puntIds: string[]) {
  for (const id of puntIds) if (!cache.has(id)) haalVraag(id).catch(() => { /* later opnieuw */ });
}
