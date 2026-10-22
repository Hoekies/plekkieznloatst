"use client";

import { usePathname } from "next/navigation";

// Uitloggen in de bovenbalk, maar niet tijdens het spel: daar tikten spelers er per ongeluk op en waren ze
// hun spel kwijt. Op de spelerskaart staat uitloggen onderaan in ℹ️, met een bevestiging.
export default function SpelerUitlog() {
  const pad = usePathname();
  if (pad?.startsWith("/speler/kaart")) return null;
  return (
    <form action="/api/auth/uitloggen" method="post" style={{ flexShrink: 0 }}>
      <button type="submit" className="speler-uitlog-btn">Uitloggen</button>
    </form>
  );
}
