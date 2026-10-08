import type { SpeciaalItem } from "@/types/database";

export type SpeciaalItemClaimResult =
  | { status: "geclaimd"; item: SpeciaalItem; requiresTarget: boolean }
  | { status: "al_geclaimd" }
  | { status: "fout"; melding: string };

export type LeaderboardEntry = {
  rank: number;
  display_name: string;
  icon: string | null;
  score: number;
  tijd_seconden: number;
  distance_meters: number;
  is_eigen_team: boolean;
};

export type SpelerLocatie = {
  session_id: string;
  teamnaam: string;
  // null = niet zichtbaar (alleen met een actieve radar zie je waar andere teams lopen)
  latitude: number | null;
  longitude: number | null;
  created_at: string | null;
  // Al gefinisht: blijft op de kaart, maar is geen tegenstander meer voor items
  gefinisht: boolean;
};
