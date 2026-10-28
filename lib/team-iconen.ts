// 🎭 Teamiconen: een grote, gevarieerde set met mensen, dieren en dingen. Elk team krijgt een willekeurig vrij
// icoon en ziet een willekeurige keuze (niet steeds dezelfde 15). Alleen emoji van één teken (zonder ZWJ),
// zodat ze op elke telefoon goed te zien zijn.
export const TEAM_ICONEN = [
  // Mensen en figuren
  "🧙", "🧛", "🧜", "🧚", "🥷", "🦸", "🦹", "🤠", "👸", "🤴", "🤡", "👻", "👽", "🤖", "🧞", "🧟", "🎅", "👑",
  // Dieren
  "🦊", "🐸", "🐧", "🦁", "🐙", "🐝", "🦄", "🦓", "🐑", "🦙", "🐼", "🐨", "🐯", "🐵", "🦒", "🐢", "🦉", "🦖",
  "🐳", "🦀", "🦔", "🐊", "🦩", "🐞", "🦜", "🐌", "🦦", "🐷",
  // Dingen
  "🍕", "🚀", "🎸", "⚽", "🎩", "🍩", "🌵", "🍄", "⚡", "🔥", "🎈", "🏆", "🧁", "🎲", "🛸", "🌈", "🍉", "🥨",
  "🎯", "🪁", "🧲", "🎺", "🍔", "🏰",
];

// Hoeveel iconen het keuzescherm tegelijk laat zien
export const ICONEN_IN_BEELD = 15;

export const isTeamIcoon = (s: unknown): s is string => typeof s === "string" && TEAM_ICONEN.includes(s);

// Willekeurige volgorde (Fisher-Yates)
export function schud<T>(lijst: readonly T[]): T[] {
  const uit = [...lijst];
  for (let i = uit.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [uit[i], uit[j]] = [uit[j], uit[i]]; }
  return uit;
}

// Een willekeurig icoon dat nog niet gebruikt is (alles op: gewoon willekeurig)
export function willekeurigIcoon(gebruikt: readonly string[] = []): string {
  const vrij = TEAM_ICONEN.filter((i) => !gebruikt.includes(i));
  const pool = vrij.length ? vrij : TEAM_ICONEN;
  return pool[Math.floor(Math.random() * pool.length)];
}
