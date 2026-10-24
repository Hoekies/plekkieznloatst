// ☕ Ko-fi: compacte knop in de stijl van de app (vervangt het plaatje ko-fi.png; scherp op elk scherm)
export default function KoFiKnop() {
  return (
    <a href="https://ko-fi.com/hoekies" target="_blank" rel="noopener noreferrer" className="kofi-knop" title="Steun PointRush op Ko-fi">
      <span className="kofi-knop-icoon" aria-hidden>☕<span className="kofi-knop-hart">❤</span></span>
      <span className="kofi-knop-tekst">
        <strong>Ko-fi</strong>
        <span>Steun het project</span>
      </span>
    </a>
  );
}
