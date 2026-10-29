
export type LeaderboardEntry = {
  rank: number;
  display_name: string;
  icon: string | null;
  score: number;
  tijd_seconden: number;
  distance_meters: number;
  is_eigen_team: boolean;
  // 📸 Goedgekeurde groepsfoto/selfie bij de finish (tijdelijke link); anders het icoon
  foto?: string | null;
  // 🏆 Grappige titel bij de eindstand (lib/prijzen.ts), bijv. 🦹 Meesterdief
  prijs?: { emoji: string; titel: string; uitleg: string } | null;
};

export type SpelerLocatie = {
  session_id: string;
  teamnaam: string;
  // Gekozen icoon van het team (emoji), zodat je ze ook herkent bij het kiezen van een tegenstander
  icon?: string | null;
  // null = niet zichtbaar (alleen met een actieve radar zie je waar andere teams lopen)
  latitude: number | null;
  longitude: number | null;
  created_at: string | null;
  // Al gefinisht: blijft op de kaart, maar is geen tegenstander meer voor items
  gefinisht: boolean;
};
