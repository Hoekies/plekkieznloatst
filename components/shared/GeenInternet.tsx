"use client";

import { useEffect, useState } from "react";

export default function GeenInternet() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    setOffline(!navigator.onLine);
    const aan = () => setOffline(false);
    const uit = () => setOffline(true);
    window.addEventListener("online", aan);
    window.addEventListener("offline", uit);
    return () => { window.removeEventListener("online", aan); window.removeEventListener("offline", uit); };
  }, []);

  if (!offline) return null;
  return (
    <div className="geen-internet-banner">
      ⚠️ Geen internetverbinding — sommige functies zijn niet beschikbaar
    </div>
  );
}
