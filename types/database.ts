export type RouteStatus = "concept" | "gepubliceerd";
export type RoutePointType = "vraagpunt" | "informatiepunt" | "eindpunt";
export type VraagType = "meerkeuze_tekst" | "meerkeuze_afbeelding" | "open";
export type AntwoordKleur = "geel" | "blauw" | "rood";
export type AntwoordType = "tekst" | "afbeelding";
export type SessieStatus = "actief" | "voltooid" | "vervallen";

export interface Route {
  id: string;
  name: string;
  status: RouteStatus;
  is_active: boolean;
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
  icon: string;
  auth_user_id: string;
  active_device_id: string | null;
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
    };
  };
}
