import type { SpeciaalItem } from "@/types/database";

export type SpeciaalItemClaimResult =
  | { status: "geclaimd"; item: SpeciaalItem; requiresTarget: boolean }
  | { status: "al_geclaimd" }
  | { status: "fout"; melding: string };

export type LeaderboardEntry = {
  rank: number;
  display_name: string;
  score: number;
  tijd_seconden: number;
  distance_meters: number;
  is_eigen_team: boolean;
};

export type SpelerLocatie = {
  session_id: string;
  group_name: string;
  latitude: number;
  longitude: number;
  created_at: string;
};
