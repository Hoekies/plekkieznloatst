"use client";

import { useRouter } from "next/navigation";

export default function UitlogKnop() {
  const router = useRouter();

  async function uitloggen() {
    await fetch("/api/auth/uitloggen", { method: "POST" });
    router.replace("/login");
  }

  return (
    <button
      onClick={uitloggen}
      className="admin-nav-link"
      style={{ cursor: "pointer", width: "100%", textAlign: "left", fontFamily: "var(--font)", background: "transparent", border: "1px solid transparent" }}
    >
      ↩ Uitloggen
    </button>
  );
}
