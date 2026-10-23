"use client";

import { STARTITEM_TYPES, MAX_PER_STARTITEM } from "@/lib/startitems";
import { ITEMS_NA_FINISH } from "@/lib/item-sessie";
import { ITEM_UITLEG } from "@/components/admin/editor/item-uitleg";

// Korte namen bij de itemplaatjes (zodat je niet hoeft te raden wat een plaatje is)
const NAAM: Record<string, string> = { banaan: "Banaan", bom: "Bom", spook: "Spook", dief: "Dief", wissel: "Wissel", verdubbeling: "Dubbel", radar: "Radar" };

// 🎒 Startitems kiezen: tik = er één bij, het rode − haalt er één af
export function StartitemsKiezer({ waarde, onWijzig }: { waarde: Record<string, number>; onWijzig: (nieuw: Record<string, number>) => void }) {
  const zet = (type: string, d: number) => {
    const n = Math.max(0, Math.min(MAX_PER_STARTITEM, (waarde[type] ?? 0) + d));
    const nieuw = { ...waarde };
    if (n) nieuw[type] = n; else delete nieuw[type];
    onWijzig(nieuw);
  };
  return (
    <div className="item-keuze">
      {STARTITEM_TYPES.map((type) => {
        const n = waarde[type] ?? 0;
        return (
          <div key={type} className="item-keuze-vak">
            <button type="button" className={`item-keuze-knop${n ? " aan" : ""}`} onClick={() => zet(type, 1)} disabled={n >= MAX_PER_STARTITEM}
              title={`${ITEM_UITLEG[type] ?? type} Tik = +1 (max ${MAX_PER_STARTITEM}).`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/items/${type}.webp`} alt="" />
              <span>{NAAM[type] ?? type}</span>
            </button>
            {n > 0 && <span className="item-keuze-aantal">{n}</span>}
            {n > 0 && <button type="button" className="item-keuze-min" onClick={() => zet(type, -1)} title="Eén minder" aria-label={`Eén ${type} minder`}>−</button>}
          </div>
        );
      })}
    </div>
  );
}

// 🏁 Items die na de finish nog ingezet mogen worden (tot de uitslag vrij is): aan/uit per item
export function NaFinishKiezer({ waarde, onWijzig }: { waarde: string[]; onWijzig: (nieuw: string[]) => void }) {
  return (
    <div className="item-keuze">
      {ITEMS_NA_FINISH.map((type) => {
        const aan = waarde.includes(type);
        return (
          <div key={type} className="item-keuze-vak">
            <button type="button" className={`item-keuze-knop${aan ? " aan" : ""}`} aria-pressed={aan}
              onClick={() => onWijzig(aan ? waarde.filter((t) => t !== type) : [...waarde, type])} title={ITEM_UITLEG[type] ?? type}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/items/${type}.webp`} alt="" />
              <span>{NAAM[type] ?? type}</span>
            </button>
          </div>
        );
      })}
    </div>
  );
}
