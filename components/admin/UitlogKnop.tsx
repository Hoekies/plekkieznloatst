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
      style={{ cursor: "pointer", width: "100%", background: "transparent", border: "1px solid transparent" }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/help/uitloggen.png" alt="Uitloggen" style={{ height: 20, width: "auto", marginLeft: "auto", borderRadius: 6, display: "block" }} />
    </button>
  );
}
