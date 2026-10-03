"use client";

import { useRouter } from "next/navigation";

export default function UitlogKnop() {
  const router = useRouter();

  async function uitloggen() {
    await fetch("/api/auth/uitloggen", { method: "POST" });
    router.replace("/login");
  }

  return (
    <button onClick={uitloggen} className="admin-nav-link">
      <span aria-hidden>🚪</span> Uitloggen
    </button>
  );
}
