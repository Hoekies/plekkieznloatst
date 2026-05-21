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

type TableDef<Row, Insert, Update = Partial<Row>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: never[];
};

export interface Database {
  public: {
    Tables: {
      routes: TableDef<Route, Omit<Route, "id" | "created_at" | "updated_at">>;
      route_points: TableDef<RoutePunt, Omit<RoutePunt, "id" | "created_at" | "updated_at">>;
      questions: TableDef<Vraag, Omit<Vraag, "id" | "created_at" | "updated_at">>;
      answer_options: TableDef<AntwoordOptie, Omit<AntwoordOptie, "id">>;
      players: TableDef<Speler, Omit<Speler, "id" | "created_at">>;
      player_sessions: TableDef<SpelerSessie, Omit<SpelerSessie, "id">>;
      player_point_progress: TableDef<SpelerPuntVoortgang, Omit<SpelerPuntVoortgang, "id">>;
      location_updates: TableDef<LocatieUpdate, Omit<LocatieUpdate, "id" | "created_at">>;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
