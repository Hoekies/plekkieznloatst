// Lijn-iconen voor het menu en de kopbalken: rustiger en strakker dan emoji, en ze nemen de kleur van de tekst over
// (ook op de oranje knop van de pagina waar je bent). Getekend op een raster van 24×24.
const PADEN = {
  dashboard: <><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9v11h5v-6h4v6h5V9" /></>,
  spelers: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" /><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8" /><path d="M18 14.3c2.1.7 3.5 2.8 3.5 5.7" /></>,
  antwoorden: <><rect x="5" y="4" width="14" height="17" rx="2" /><path d="M9 4V3h6v1" /><path d="m8.5 12 2 2 4-4" /><path d="M8.5 17.5h7" /></>,
  live: <><circle cx="12" cy="12" r="2" /><path d="M7.8 7.8a6 6 0 0 0 0 8.4" /><path d="M16.2 7.8a6 6 0 0 1 0 8.4" /><path d="M4.9 4.9a10 10 0 0 0 0 14.2" /><path d="M19.1 4.9a10 10 0 0 1 0 14.2" /></>,
  routes: <><path d="m3 6 6-2.5 6 2.5 6-2.5v14.5l-6 2.5-6-2.5-6 2.5z" /><path d="M9 3.5V18" /><path d="M15 6v14.5" /></>,
  instellingen: <><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><circle cx="12" cy="12" r="3" /></>,
  seizoenen: <><rect x="3.5" y="5" width="17" height="15.5" rx="2" /><path d="M3.5 10h17" /><path d="M8 3v4M16 3v4" /><path d="M8 14h2M14 14h2M8 17h2" /></>,
  palet: <><path d="M12 3a9 9 0 1 0 0 18c1.1 0 1.8-.8 1.8-1.8 0-.5-.2-.9-.5-1.2-.3-.3-.5-.7-.5-1.2 0-1 .8-1.8 1.8-1.8H17a4 4 0 0 0 4-4C21 6.6 17 3 12 3z" /><circle cx="7.5" cy="11" r="1" /><circle cx="10" cy="7" r="1" /><circle cx="14.5" cy="7" r="1" /><circle cx="17" cy="11" r="1" /></>,
  systeem: <><path d="M3 12h4l2.5-6 4 12 2.5-6H21" /></>,
  meldingen: <><path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z" /><path d="M10 20.5a2 2 0 0 0 4 0" /></>,
  "meldingen-uit": <><path d="M6 16V11a6 6 0 0 1 9.5-4.9M18 11v5l1.5 2H8" /><path d="M10 20.5a2 2 0 0 0 4 0" /><path d="m3.5 3.5 17 17" /></>,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v6" /><path d="M12 7.5v.01" /></>,
  beginnen: <><circle cx="12" cy="12" r="9" /><path d="m15.5 8.5-2 5-5 2 2-5z" /></>,
  kaartjes: <><rect x="3" y="7" width="13" height="14" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" /><path d="M6.5 12h6M6.5 15.5h4" /></>,
  handleiding: <><path d="M3 5.5C5 4 8 4 12 6c4-2 7-2 9-.5V19c-2-1.5-5-1.5-9 .5-4-2-7-2-9-.5z" /><path d="M12 6v13.5" /></>,
  replay: <><path d="M3 12a9 9 0 1 0 2.6-6.4" /><path d="M3 4v5h5" /><path d="m10.5 9 4 3-4 3z" /></>,
  voorproefje: <><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" /><path d="M8.5 13h7M8.5 16.5h5" /></>,
  inklappen: <><path d="m11 17-5-5 5-5" /><path d="m18 17-5-5 5-5" /></>,
  uitklappen: <><path d="m6 17 5-5-5-5" /><path d="m13 17 5-5-5-5" /></>,
};

export type MenuIcoonNaam = keyof typeof PADEN;

export default function MenuIcoon({ naam }: { naam: MenuIcoonNaam }) {
  return (
    <span aria-hidden className="menu-icoon">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">{PADEN[naam]}</svg>
    </span>
  );
}
