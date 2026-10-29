"use client";

import { useEffect } from "react";
import { zetConfettiThema } from "@/lib/confetti";

// 🗓️ Het seizoensthema (met een in het beheer vastgezet thema) voor alle confetti in de spelersapp
export default function ConfettiThema({ sleutel, emoji = null }: { sleutel: string | null; emoji?: string | null }) {
  useEffect(() => { zetConfettiThema(sleutel, emoji); }, [sleutel, emoji]);
  return null;
}
