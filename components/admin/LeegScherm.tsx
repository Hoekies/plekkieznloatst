import Link from "next/link";

// Leeg scherm, overal hetzelfde: een icoon, een korte uitleg en (als er iets te doen is) één knop
export default function LeegScherm({ icoon, children, knop }: {
  icoon: string;
  children: React.ReactNode;
  knop?: { label: string; href?: string; onClick?: () => void };
}) {
  return (
    <div className="card leeg-scherm">
      <span className="leeg-scherm-icoon" aria-hidden>{icoon}</span>
      <p>{children}</p>
      {knop && (knop.href
        ? <Link href={knop.href} className="rl-knop rl-knop--cyan actie-knop">{knop.label}</Link>
        : <button type="button" className="rl-knop rl-knop--cyan actie-knop" onClick={knop.onClick}>{knop.label}</button>)}
    </div>
  );
}
