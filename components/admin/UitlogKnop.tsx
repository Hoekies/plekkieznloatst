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
      style={{
        background: "none", border: "none",
        color: "rgba(255,255,255,0.5)", fontSize: "0.8rem",
        cursor: "pointer", padding: 0,
      }}
    >
      ↩ Uitloggen
    </button>
  );
}
