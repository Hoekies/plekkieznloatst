export type RouteStatus = "concept" | "gepubliceerd";
export type RoutePointType = "vraagpunt" | "informatiepunt" | "eindpunt";
export type VraagType = "meerkeuze_tekst" | "meerkeuze_afbeelding" | "open" | "foto_opdracht";
export type AntwoordKleur = "geel" | "blauw" | "rood" | "groen";
export type AntwoordType = "tekst" | "afbeelding";
export type SessieStatus = "actief" | "voltooid" | "vervallen";
export type FotoStatus = "wacht" | "goedgekeurd" | "afgekeurd";

export type RouteModus = "sequentieel" | "verspreid";

export interface Route {
  id: string;
  name: string;
  status: RouteStatus;
  is_active: boolean;
  modus: RouteModus;
  verwacht_aantal_teams: number;
  doel_afstand_km: number;
  ster_waarde: number;
  bom_waarde: number;
  item_respawn: boolean;
  respawn_minuten: number;
  plekzooi_duur_seconden: number;
  items_last_rotated_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SessionPointOrder {
  id: string;
  session_id: string;
  volgorde: number;
  route_point_id: string;
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

export interface LocatieUpdate {
  id: string;
  session_id: string;
  latitude: number;
  longitude: number;
  accuracy_meters: number;
  public_latitude: number;
  public_longitude: number;
  created_at: string;
}

export interface FotoInzending {
  id: string;
  session_id: string;
  route_point_id: string;
  foto_pad: string;
  status: FotoStatus;
  punten_toegekend: number;
  beoordeeld_op: string | null;
  created_at: string;
}

export interface Broadcast {
  id: string;
  bericht: string;
  created_at: string;
}

export type SpeciaalItemType = "spook" | "bom" | "ster" | "verdubbeling" | "wissel" | "dief" | "radar" | "banaan" | "plekzooi" | "vraagteken";
export type SpeciaalItemEffectType = "ghost" | "punt_aftrek" | "verdubbeling" | "wissel" | "diefstal" | "radar" | "banaan" | "plekzooi";

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
  created_at: string;
  updated_at: string;
}

export interface SpeciaalItemEffect {
  id: string;
  special_item_id: string;
  target_session_id: string;
  effect_type: SpeciaalItemEffectType;
  expires_at: string | null;
  applied_at: string;
  notification: string | null;
}

export interface Database {
  public: {
    Tables: {
      routes: { Row: Route; Insert: Omit<Route, "id" | "created_at" | "updated_at">; Update: Partial<Route> };
      route_points: { Row: RoutePunt; Insert: Omit<RoutePunt, "id" | "created_at" | "updated_at">; Update: Partial<RoutePunt> };
      questions: { Row: Vraag; Insert: Omit<Vraag, "id" | "created_at" | "updated_at">; Update: Partial<Vraag> };
      answer_options: { Row: AntwoordOptie; Insert: Omit<AntwoordOptie, "id">; Update: Partial<AntwoordOptie> };
      players: { Row: Speler; Insert: Omit<Speler, "id" | "created_at">; Update: Partial<Speler> };
      player_sessions: { Row: SpelerSessie; Insert: Omit<SpelerSessie, "id">; Update: Partial<SpelerSessie> };
      player_point_progress: { Row: SpelerPuntVoortgang; Insert: Omit<SpelerPuntVoortgang, "id">; Update: Partial<SpelerPuntVoortgang> };
      location_updates: { Row: LocatieUpdate; Insert: Omit<LocatieUpdate, "id" | "created_at">; Update: Partial<LocatieUpdate> };
      foto_inzendingen: { Row: FotoInzending; Insert: Omit<FotoInzending, "id" | "created_at">; Update: Partial<FotoInzending> };
      broadcasts: { Row: Broadcast; Insert: Omit<Broadcast, "id" | "created_at">; Update: Partial<Broadcast> };
      special_items: {
        Row: SpeciaalItem;
        Insert: Omit<SpeciaalItem, "id" | "created_at" | "updated_at" | "claimed" | "claimed_by_session_id" | "claimed_at" | "used_at">;
        Update: Partial<SpeciaalItem>;
      };
      special_item_effects: {
        Row: SpeciaalItemEffect;
        Insert: Omit<SpeciaalItemEffect, "id" | "applied_at">;
        Update: Partial<SpeciaalItemEffect>;
      };
    };
  };
}
