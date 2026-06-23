"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const DEVICE_ID_KEY = "pointrush_device_id";

export default function DeviceGuard() {
  const router = useRouter();

  useEffect(() => {
    let deviceId = localStorage.getItem(DEVICE_ID_KEY);
    if (!deviceId) {
      deviceId = crypto.randomUUID();
      localStorage.setItem(DEVICE_ID_KEY, deviceId);
    }

    (async () => {
      try {
        const res = await fetch("/api/auth/device-check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ deviceId }),
        });
        if (!res.ok) {
          router.replace("/login?fout=apparaat");
        }
      } catch {
        // Geen verbinding: niet blokkeren, gewoon doorgaan
      }
    })();
  }, [router]);

  return null;
}
