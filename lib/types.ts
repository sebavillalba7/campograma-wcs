export type CsvRow = Record<string, string | number | null>;

export type Point = {
  t: number;
  x: number;
  y: number;
  speed: number;
  acc: number;
  quality?: number;
};

export type Athlete = {
  id: string;
  name: string;
  position: string;
  isGoalkeeper: boolean;
  points: Point[];
};

export type MinuteMetric = {
  minute: number;
  athlete: string;
  position: string;
  distance: number;
  mtsMin: number;
  hs19: number;
  hs24: number;
  ad: number;
  maxSpeed: number;
};

export type EventItem = {
  id: string;
  second: number;
  minute: string;
  type: "Gol" | "Gol anulado" | "Amarilla" | "Roja" | "VAR" | "Cambio";
  team: string;
  player: string;
  detail?: string;
};

export type MatchRecord = {
  id: string;
  name: string;
  opponent: string;
  date: string;
  createdAt: string;
  sources: string[];
  athletes: Athlete[];
  metrics: MinuteMetric[];
  events: EventItem[];
  duration: number;
  warnings: string[];
};

export const POSITION_OPTIONS = [
  "SIN POS.", "ARQ", "DEF CEN I", "DEF CEN D", "DEF LAT I", "DEF LAT D", "DEL"
] as const;

export type PlayerProfile = { key: string; displayName: string; position: string; updatedAt: string };
