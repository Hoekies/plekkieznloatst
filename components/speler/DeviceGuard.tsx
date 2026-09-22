"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const DEVICE_ID_KEY = "pointrush_device_id";
const CHECK_INTERVAL_MS = 20000;

export default function DeviceGuard() {
  const router = useRouter();

  useEffect(() => {
    let deviceId = localStorage.getItem(DEVICE_ID_KEY);
    if (!deviceId) {
      deviceId = crypto.randomUUID();
      localStorage.setItem(DEVICE_ID_KEY, deviceId);
    }

    let gestopt = false;

    async function check() {
      try {
        const res = await fetch("/api/auth/device-check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ deviceId }),
        });
        if (gestopt) return;
        if (res.status === 409) {
          const { reden } = await res.json().catch(() => ({ reden: null }));
          router.replace(reden === "uitgelogd" ? "/login?fout=uitgelogd" : "/login?fout=apparaat");
        } else if (!res.ok) {
          router.replace("/login?fout=apparaat");
        }
      } catch {
        // Geen verbinding: niet blokkeren, gewoon doorgaan
      }
    }

    check();
    const interval = setInterval(check, CHECK_INTERVAL_MS);
    return () => {
      gestopt = true;
      clearInterval(interval);
    };
  }, [router]);

  return null;
}
