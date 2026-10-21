// Trillen op belangrijke momenten in de spelersapp (Android; de iPhone laat een website niet trillen).
// Elk moment een eigen ritme, zodat je het in je zak ook voelt.
export const TRIL = {
  puntBereikt: [100, 60, 100],
  gepasseerd: [40],
  itemGepakt: [60, 40, 60],
  startitems: [60, 40, 60, 40, 60],
  goed: [80],
  fout: [250],
  finish: [200, 100, 200, 100, 400],
} as const;

export function tril(patroon: readonly number[]) {
  try { navigator.vibrate?.([...patroon]); } catch { /* trillen niet mogelijk */ }
}
