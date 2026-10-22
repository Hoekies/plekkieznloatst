"use client";

import { useEffect } from "react";
import { zetGeluidSet } from "@/lib/sounds";

// Zet de geluidset van de actieve route (gekozen door de beheerder) voor alle geluiden in de app
export default function GeluidSetKiezen({ set }: { set: string }) {
  useEffect(() => { zetGeluidSet(set); }, [set]);
  return null;
}
