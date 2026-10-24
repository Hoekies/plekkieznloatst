// ▸ Uitklap-pijl, overal dezelfde: een pijltje in een rondje. Dicht wijst hij naar rechts, open draait hij
// naar beneden en kleurt hij goud. Het rondje is alleen beeld; de knop of regel eromheen doet het werk.
export default function UitklapPijl({ open }: { open: boolean }) {
  return (
    <span className={`uitklap-pijl${open ? " uitklap-pijl--open" : ""}`} aria-hidden>
      <svg viewBox="0 0 10 10" width="10" height="10">
        <path d="M3.6 1.6 7 5 3.6 8.4" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}
