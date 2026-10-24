"use client";

import { useState } from "react";
import type { SpeciaalItem } from "@/types/database";
import { itemNaam } from "@/components/speler/SpeciaalItemLegende";
import { ITEM_UITLEG } from "./item-uitleg";
import UitklapPijl from "@/components/shared/UitklapPijl";
import Icoon from "@/components/admin/Icoon";

// Volgorde van de soorten: zoals bij het plaatsen (voordeel, aanval, vraagteken, plek zooi)
const VOLGORDE = Object.keys(ITEM_UITLEG);

// 🎁 Items van de route, per soort gegroepeerd: kop met icoon, naam en aantal (in/uit te klappen),
// eronder de items. De soort van het item dat op de kaart gekozen is, klapt vanzelf open.
export default function ItemLijst({ items, gekozen, onKies, onVerwijder }: {
  items: SpeciaalItem[];
  gekozen: SpeciaalItem | null;
  onKies: (item: SpeciaalItem | null) => void;
  onVerwijder: (id: string) => void;
}) {
  const [open, setOpen] = useState<Set<string>>(new Set());
  const groepen = VOLGORDE.concat([...new Set(items.map((i) => i.type))].filter((t) => !VOLGORDE.includes(t)))
    .map((type) => ({ type, items: items.filter((i) => i.type === type) }))
    .filter((g) => g.items.length > 0);
  const wissel = (type: string) => setOpen((o) => { const n = new Set(o); if (n.has(type)) n.delete(type); else n.add(type); return n; });

  return (
    <>
      {groepen.map(({ type, items: lijst }) => {
        const isOpen = open.has(type) || gekozen?.type === type;
        const gepakt = lijst.filter((i) => i.claimed).length;
        return (
          <div key={type} className="item-groep">
            <button type="button" className="item-groep-kop" onClick={() => wissel(type)} aria-expanded={isOpen} title={ITEM_UITLEG[type]}>
              <UitklapPijl open={isOpen} />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/items/${type}.webp`} alt="" />
              <span className="item-groep-naam">{itemNaam(type)}</span>
              {gepakt > 0 && <span className="item-groep-gepakt">{gepakt} gepakt</span>}
              <span className="item-groep-aantal">{lijst.length}</span>
            </button>
            {isOpen && lijst.map((item, i) => {
              const isGekozen = gekozen?.id === item.id;
              return (
                <div key={item.id} onClick={() => onKies(isGekozen ? null : item)}
                  className={`lijst-rij item-rij${isGekozen ? " lijst-rij--gekozen item-rij--gekozen" : ""}${item.claimed ? " item-rij--gepakt" : ""}`}>
                  <span className="item-rij-naam">
                    {/* Eigen naam, anders de soort met een volgnummer */}
                    {item.name && item.name !== "Speciaal item" ? item.name : `${itemNaam(type)} ${i + 1}`}
                  </span>
                  {item.claimed && <span className="item-rij-gepakt">gepakt</span>}
                  <button className="lijst-rij-acties item-rij-weg" title="Item verwijderen (terugzetten kan met ↶)" aria-label="Item verwijderen"
                    onClick={(e) => { e.stopPropagation(); onVerwijder(item.id); }}><Icoon naam="wissen" /></button>
                </div>
              );
            })}
          </div>
        );
      })}
    </>
  );
}
