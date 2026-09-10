import { csvMetadata, keyOf, num, parseCsv } from "./csv";
import type { Athlete, MatchRecord, MinuteMetric, Point } from "./types";

const POSITIONS: Record<string, string> = {
  "m mansilla": "ARQ", "b pitton": "LI", "l ayala": "LI", "j ludueña": "DC", "m rodriguez": "DC",
  "l vargas": "LD", "j pintado": "LD", "m rocha": "LD", "i malcorra": "MOI", "m luna diale": "MOI",
  "j palacios": "MOD", "e giaccone": "MC", "l menossi": "MC", "j mosqueira": "MC", "b cuello": "MO",
  "c tarragona": "DEL", "m estigarribia": "DEL", "e ramirez": "DEL", "m aguirre": "DEL"
};

const clean = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[_-]+/g, " ").replace(/\.(csv|txt)$/i, "").replace(/\s+/g, " ").trim();
const label = (s: string) => clean(s).split(" ").map(x => x ? x[0].toUpperCase() + x.slice(1) : x).join(" ");

function athletePosition(name: string) {
  const n = clean(name);
  const exact = Object.entries(POSITIONS).find(([k]) => n.includes(k));
  return exact?.[1] || "SIN POS.";
}

function timestampSeconds(raw: unknown, fallback: number) {
  const value = String(raw ?? "");
  const latin = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})(?:\.(\d+))?/);
  if (latin) return Date.UTC(+latin[3], +latin[2]-1, +latin[1], +latin[4], +latin[5], +latin[6], +String(latin[7] || "0").padEnd(3,"0").slice(0,3)) / 1000;
  const date = Date.parse(value);
  if (Number.isFinite(date)) return date / 1000;
  return num(raw) || fallback;
}

function gpsAthlete(file: File, text: string, warnings: string[]): Athlete | null {
  const rows = parseCsv(text);
  if (!rows.length) return null;
  const sample = rows[0];
  const latK = keyOf(sample, ["latitude", "latitud", "lat"]);
  const lonK = keyOf(sample, ["longitude", "longitud", "lon", "lng"]);
  if (!latK || !lonK) return null;
  const athleteK = keyOf(sample, ["athlete", "player", "jugador"]);
  const timeK = keyOf(sample, ["timestamp", "date time", "datetime", "utc"]);
  const secondsK = keyOf(sample, ["seconds", "segundos", "second"]);
  const velocityK = keyOf(sample, ["velocity", "velocidad", "speed"]);
  const accK = keyOf(sample, ["acceleration", "aceleracion"]);
  const qualityK = keyOf(sample, ["positional quality", "hdop", "calidad posicional"]);
  const namedRow = athleteK ? rows.find(r => Boolean(r[athleteK])) : undefined;
  const metaName = csvMetadata(text).athlete;
  const fileName = file.name.match(/Export for\s+(.+?)\s+\d+(?:\(\d+\))?\.csv$/i)?.[1];
  const rawName = String(metaName || (athleteK && namedRow ? namedRow[athleteK] : fileName || file.name));
  const name = label(rawName);
  const raw = rows.map((r, i) => ({
    abs: timestampSeconds(timeK ? r[timeK] : undefined, secondsK ? num(r[secondsK]) : i),
    lat: num(r[latK]), lon: num(r[lonK]), speed: num(velocityK ? r[velocityK] : 0),
    acc: num(accK ? r[accK] : 0), quality: qualityK ? num(r[qualityK]) : undefined
  })).filter(p => p.lat && p.lon);
  if (!raw.length) { warnings.push(`${file.name}: sin coordenadas GPS válidas.`); return null; }
  const lat0 = raw.reduce((a, p) => a + p.lat, 0) / raw.length;
  const lon0 = raw.reduce((a, p) => a + p.lon, 0) / raw.length;
  const cos = Math.cos(lat0 * Math.PI / 180);
  const local = raw.map(p => ({ ...p, east: (p.lon - lon0) * 111320 * cos, north: (p.lat - lat0) * 110540 }));
  const t0 = local[0].abs;
  // OpenField exporta a 10 Hz; se conserva un cuadro por segundo para el reproductor.
  const bySecond = new Map<number, typeof local[number]>();
  local.forEach(p => { const sec = Math.max(0, Math.round(p.abs - t0)); const current = bySecond.get(sec); if (!current || (p.quality || 0) > (current.quality || 0)) bySecond.set(sec, p); });
  const points: Point[] = [...bySecond.entries()].map(([t,p]) => ({ t, x: p.east, y: p.north, speed: p.speed, acc: p.acc, quality: p.quality }));
  return { id: crypto.randomUUID(), name, position: athletePosition(name), isGoalkeeper: athletePosition(name) === "ARQ", points };
}

function normalizePitch(athletes: Athlete[]) {
  const pts = athletes.flatMap(a => a.points);
  if (!pts.length) return;
  const xs = pts.map(p => p.x).sort((a, b) => a - b), ys = pts.map(p => p.y).sort((a, b) => a - b);
  const q = (arr: number[], f: number) => arr[Math.floor((arr.length - 1) * f)];
  const x0 = q(xs, .01), x1 = q(xs, .99), y0 = q(ys, .01), y1 = q(ys, .99);
  const swap = (x1 - x0) < (y1 - y0);
  athletes.forEach(a => a.points.forEach(p => {
    const long = swap ? p.y : p.x, short = swap ? p.x : p.y;
    const l0 = swap ? y0 : x0, l1 = swap ? y1 : x1, s0 = swap ? x0 : y0, s1 = swap ? x1 : y1;
    p.x = Math.max(0, Math.min(105, ((long - l0) / Math.max(1, l1 - l0)) * 105));
    p.y = Math.max(0, Math.min(70, ((short - s0) / Math.max(1, s1 - s0)) * 70));
  }));
}

function summaryMetrics(rows: ReturnType<typeof parseCsv>): MinuteMetric[] {
  if (!rows.length) return [];
  const s = rows[0];
  const athleteK = keyOf(s, ["athlete", "player", "jugador"]);
  const nameK = keyOf(s, ["name", "nombre"]);
  const minuteK = keyOf(s, ["minute", "minuto", "min"]);
  const distK = keyOf(s, ["total distance", "tot_dist", "distancia total", "dist"]);
  const rateK = keyOf(s, ["mts/min", "m/min", "meters per minute"]);
  const h19K = keyOf(s, ["mts > 19", "distance > 19", "hsd", "high speed running"]);
  const h24K = keyOf(s, ["mts > 24", "distance > 24", "sprint distance", "spd"]);
  const accK = keyOf(s, ["a+d", "acceleration efforts", "acel+des"]);
  const maxK = keyOf(s, ["vel max", "max velocity", "maximum velocity", "max speed"]);
  if (!athleteK && !nameK) return [];
  return rows.map((r, i) => {
    const packed = String(nameK ? r[nameK] || "" : "");
    const parsed = packed.match(/^(PRIMER_TIEMPO|SEGUNDO_TIEMPO)\s*-\s*(.+?)\s*-\s*(\d{2}):(\d{2}):(\d{2})$/i);
    const athlete = parsed ? parsed[2] : String(athleteK ? r[athleteK] || "" : "");
    const packedMinute = parsed ? Number(parsed[4]) : 0;
    const minute = parsed ? packedMinute + (/SEGUNDO/i.test(parsed[1]) ? 45 : 0) : Math.max(1, Math.round(num(minuteK ? r[minuteK] : i + 1)));
    const distance = num(distK ? r[distK] : 0);
    return { minute, athlete: label(athlete), position: athletePosition(athlete), distance, mtsMin: num(rateK ? r[rateK] : distance), hs19: num(h19K ? r[h19K] : 0), hs24: num(h24K ? r[h24K] : 0), ad: num(accK ? r[accK] : 0), maxSpeed: num(maxK ? r[maxK] : 0) };
  }).filter(r => r.athlete && r.minute > 0 && r.mtsMin > 0);
}

export async function processFiles(summary: File, gpsFiles: File[], meta: { opponent: string; date: string; sources: string[] }): Promise<MatchRecord> {
  const warnings: string[] = [];
  const summaryText = await summary.text();
  const summaryRows = parseCsv(summaryText);
  const gpsTexts = await Promise.all(gpsFiles.map(f => f.text()));
  const athletes = gpsFiles.map((f,i) => gpsAthlete(f, gpsTexts[i], warnings)).filter(Boolean) as Athlete[];
  normalizePitch(athletes);
  const unknown = athletes.filter(a => a.position === "SIN POS.").map(a => a.name);
  if (unknown.length) warnings.push(`Asignar posición antes del informe definitivo: ${unknown.join(", ")}.`);
  const metrics = summaryMetrics(summaryRows);
  if (!athletes.length) throw new Error("No se pudo leer ningún GPS. Verificá que sean exportaciones individuales de OpenField con Latitude y Longitude.");
  if (!metrics.length) throw new Error("No se pudo leer el resumen. Debe incluir Name o Athlete y la métrica Mts/Min.");
  const summaryActivityKey = summaryRows[0] ? keyOf(summaryRows[0], ["activity name", "actividad", "activity"]) : undefined;
  const summaryActivity = summaryActivityKey ? String(summaryRows.find(r => r[summaryActivityKey])?.[summaryActivityKey] || "") : "";
  const gpsPeriods = [...new Set(gpsTexts.map(t => csvMetadata(t).period).filter(Boolean))];
  const normMatch = (s: string) => clean(s).replace(/^vs\s*/, "");
  if (summaryActivity && gpsPeriods.length && !gpsPeriods.some(p => normMatch(p) === normMatch(summaryActivity))) {
    throw new Error(`Los archivos no corresponden al mismo partido: el resumen indica ${summaryActivity} y los GPS indican ${gpsPeriods.join(", ")}.`);
  }
  const duration = Math.max(0, ...athletes.flatMap(a => a.points.map(p => p.t)), ...metrics.map(m => m.minute * 60));
  return { id: crypto.randomUUID(), name: `Unión vs ${meta.opponent}`, opponent: meta.opponent, date: meta.date, createdAt: new Date().toISOString(), sources: meta.sources, athletes, metrics, events: [], duration, warnings };
}
