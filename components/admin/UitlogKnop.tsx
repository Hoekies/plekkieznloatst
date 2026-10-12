"use client";

import { useRouter } from "next/navigation";

// compact = knop rechtsboven in het beheerscherm; anders als regel in het menu (mobiel)
export default function UitlogKnop({ compact = false }: { compact?: boolean }) {
  const router = useRouter();

  async function uitloggen() {
    await fetch("/api/auth/uitloggen", { method: "POST" });
    router.replace("/login");
  }

  if (compact) {
    return <button onClick={uitloggen} className="btn btn-outline" style={{ fontSize: "0.82rem" }} title="Uitloggen">🚪 Uitloggen</button>;
  }
  return (
    <button onClick={uitloggen} className="admin-nav-link">
      <span aria-hidden>🚪</span> Uitloggen
    </button>
  );
}
