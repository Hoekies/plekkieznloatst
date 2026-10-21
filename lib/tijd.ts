// Een duur in minuten leesbaar, overal in de app op dezelfde manier: "12 min", "3 u 5 min", "2 d 4 u"
export function duurKort(minuten: number): string {
  const min = Math.max(0, Math.round(minuten));
  if (min < 60) return `${min} min`;
  if (min < 1440) return `${Math.floor(min / 60)} u${min % 60 ? ` ${min % 60} min` : ""}`;
  const u = Math.floor((min % 1440) / 60);
  return `${Math.floor(min / 1440)} d${u ? ` ${u} u` : ""}`;
}
