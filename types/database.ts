export type RouteStatus = "concept" | "gepubliceerd";
// doorlooppunt: de speler krijgt geen scherm, het punt telt vanzelf als gepasseerd (migratie 013)
export type RoutePointType = "vraagpunt" | "informatiepunt" | "eindpunt" | "doorlooppunt";
export type VraagType = "meerkeuze_tekst" | "meerkeuze_afbeelding" | "open" | "foto_opdracht" | "stemvraag";
export type AntwoordKleur = "geel" | "blauw" | "rood" | "groen";
export type AntwoordType = "tekst" | "afbeelding";
export type SessieStatus = "actief" | "voltooid" | "vervallen";
export type FotoStatus = "wacht" | "goedgekeurd" | "afgekeurd";

export type RouteModus = "sequentieel" | "verspreid";

export interface Route {
  id: string;
  name: string;
  // 📁 Map in het routeoverzicht (migratie 022); null = geen map
  map?: string | null;
  status: RouteStatus;
  is_active: boolean;
  modus: RouteModus;
  verwacht_aantal_teams: number;
  doel_afstand_km: number;
  ster_waarde: number;
  bom_waarde: number;
  item_respawn: boolean;
  // Op volgorde: spelers zien meteen alle punten en de lijn ertussen (migratie 012)
  alle_punten_zichtbaar?: boolean;
  // 🧩 Puzzelwoord (leeg = uit) en de bonus bij goed raden; verboden gebieden op de kaart (migratie 014)
  puzzelwoord?: string | null;
  puzzel_bonus?: number;
  puzzel_omschrijving?: string | null;
  // 🧩 Puzzelwoord aan/uit en letters per vraag (migratie 017): { route_point_id: 0 | 2 }, de rest 1
  puzzel_aan?: boolean | null;
  puzzel_verdeling?: Record<string, number> | null;
  // Punten bij de finish: per gevonden letter en voor het zelf afmaken (puzzel_bonus = alle letters gevonden)
  puzzel_letter_punten?: number | null;
  puzzel_raad_bonus?: number | null;
  // ❓ Standaard punten voor een nieuwe vraag (migratie 025); leeg = 65
  vraag_punten?: number | null;
  // 🚶 Rondje: meters lopen voor de eerste vraag (migratie 026); leeg = 25
  startvraag_meter?: number | null;
  // Letters willekeurig (per team anders) of op volgorde (migratie 018)
  puzzel_volgorde?: "willekeurig" | "op_volgorde" | null;
  // 🎨 Huisstijl en 🔔 geluidset (migratie 016)
  huisstijl_kleur?: string | null;
  huisstijl_logo_pad?: string | null;
  welkom_foto_pad?: string | null;
  geluid_set?: string | null;
  verboden_gebieden?: { naam: string; punten: [number, number][] }[] | null;
  respawn_minuten: number;
  plekzooi_duur_seconden: number;
  spook_duur_seconden: number;
  tussenstand_interval_minuten: number;
  tussenstand_duur_seconden: number;
  tussenstand_trigger_at: string | null;
  uitslag_vrijgegeven: boolean;
  items_na_finish: boolean;
  // Items die een gefinisht team nog mag inzetten (null = oude schakelaar: alles of niets)
  items_na_finish_types: string[] | null;
  // Items die elk team bij de start gratis krijgt, per type het aantal (null = standaard)
  startitems: Record<string, number> | null;
  // Verspreid: teamnummers die het rondje andersom lopen
  omgekeerde_teams: number[] | null;
  // Verspreid: zelfgekozen instappunt per team (teamnummer → punt-id)
  instappunten: Record<string, string> | null;
  items_last_rotated_at: string | null;
  // Laatste bewerking in de editor (route, punten, vragen, items); niet het spelen zelf (migratie 003)
  bewerkt_op?: string | null;
  created_at: string;
  updated_at: string;
}

export interface RoutePunt {
  id: string;
  route_id: string;
  order_index: number;
  type: RoutePointType;
  name: string;
  description: string | null;
  latitude: number;
  longitude: number;
  radius_meters: number;
  points: number;
  image_path: string | null;
  sound_path: string | null;
  qr_unlock_enabled: boolean;
  qr_secret: string | null;
  created_at: string;
  updated_at: string;
}

export interface Vraag {
  id: string;
  route_point_id: string;
  type: VraagType;
  question_text: string;
  question_image_path: string | null;
  points: number;
  correct_text_answers: string[] | null;
  numeric_answer: number | null;
  numeric_tolerance: number | null;
  // Per vraag aan of uit (migratie 014)
  antwoorden_husselen?: boolean;
  geluid_pad?: string | null;           // geluidsfragment in de opslag "vraag-geluid"
  tijdslimiet_seconden?: number | null;  // null = geen tijdslimiet
  // 🗳️ Stemvraag: stemming gesloten en punten uitgedeeld (migratie 016)
  stem_gesloten?: boolean;
  created_at: string;
  updated_at: string;
}

export interface AntwoordOptie {
  id: string;
  question_id: string;
  order_index: number;
  color: AntwoordKleur;
  answer_type: AntwoordType;
  text: string | null;
  image_path: string | null;
  is_correct: boolean;
  // Punten voor dit antwoord; null = goed antwoord krijgt de vraagpunten, fout 0
  punten: number | null;
  // 💬 Waarom dit antwoord (niet) goed is; de speler ziet het na het antwoorden (migratie 023)
  uitleg?: string | null;
}

export interface Speler {
  id: string;
  group_name: string;
  login_name: string | null;
  nickname: string | null;
  icon: string | null;
  auth_user_id: string;
  active_device_id: string | null;
  is_uitgeschakeld: boolean;
  force_logout_at: string | null;
  // Ingelogd via een inloglink: tot dit moment (migratie 008)
  toegang_tot?: string | null;
  // Telefoonnummer van het team, +31612345678 (migratie 009)
  telefoon?: string | null;
  created_at: string;
}

export interface SpelerSessie {
  id: string;
  player_id: string;
  route_id: string;
  started_at: string;
  finished_at: string | null;
  current_point_id: string | null;
  score: number;
  afstand_m: number;
  status: SessieStatus;
}

export interface SpelerPuntVoortgang {
  id: string;
  session_id: string;
  route_point_id: string;
  reached_at: string;
  answered_at: string | null;
  selected_answer_id: string | null;
  open_answer_text: string | null;
  is_correct: boolean | null;
  points_awarded: number;
}

export type SpeciaalItemType = "spook" | "bom" | "ster" | "verdubbeling" | "wissel" | "dief" | "radar" | "banaan" | "plekzooi" | "vraagteken";

export interface SpeciaalItem {
  id: string;
  route_id: string;
  type: SpeciaalItemType;
  name: string;
  latitude: number;
  longitude: number;
  radius_meters: number;
  points_effect: number;
  claimed: boolean;
  claimed_by_session_id: string | null;
  claimed_at: string | null;
  used_at: string | null;
  respawn_at: string | null;
  is_startitem: boolean;
  created_at: string;
  updated_at: string;
}

