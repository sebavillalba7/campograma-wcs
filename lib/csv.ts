import type { CsvRow } from "./types";

function splitLine(line: string, delimiter: string) {
  const out: string[] = [];
  let value = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (quoted && line[i + 1] === '"') { value += '"'; i++; }
      else quoted = !quoted;
    } else if (c === delimiter && !quoted) { out.push(value.trim()); value = ""; }
    else value += c;
  }
  out.push(value.trim());
  return out;
}

export function parseCsv(text: string): CsvRow[] {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const delimiter = (lines[0].match(/;/g)?.length || 0) > (lines[0].match(/,/g)?.length || 0) ? ";" : ",";
  const headers = splitLine(lines[0], delimiter).map(h => h.trim());
  return lines.slice(1).map(line => {
    const values = splitLine(line, delimiter);
    return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? ""]));
  });
}

export function keyOf(row: CsvRow, aliases: string[]) {
  const keys = Object.keys(row);
  const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
  const wanted = aliases.map(norm);
  return keys.find(k => wanted.includes(norm(k))) || keys.find(k => wanted.some(a => norm(k).includes(a)));
}

export function num(value: unknown) {
  if (typeof value === "number") return value;
  const raw = String(value ?? "").trim().replace(/\s/g, "");
  const normalized = raw.includes(",") && !raw.includes(".") ? raw.replace(",", ".") : raw.replace(/,/g, "");
  const n = Number(normalized);
  return Number.isFinite(n) ? n : 0;
}
