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
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).map(x => x.trim()).filter(Boolean);
  if (lines.length < 2) return [];
  // OpenField antepone metadatos con #. El encabezado real es la primera línea tabular.
  const headerIndex = lines.findIndex(line => !line.startsWith("#") && /[;,]/.test(line));
  if (headerIndex < 0) return [];
  const headerLine = lines[headerIndex];
  const delimiter = (headerLine.match(/;/g)?.length || 0) > (headerLine.match(/,/g)?.length || 0) ? ";" : ",";
  const headers = splitLine(headerLine, delimiter).map(h => h.trim());
  return lines.slice(headerIndex + 1).filter(line => !line.startsWith("#")).map(line => {
    const values = splitLine(line, delimiter);
    return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? ""]));
  });
}

export function csvMetadata(text: string) {
  const metadata: Record<string, string> = {};
  for (const line of text.replace(/^\uFEFF/, "").split(/\r?\n/)) {
    const match = line.match(/^#\s*([^:]+)\s*:\s*"?([^"\r\n]+)"?\s*$/);
    if (match) metadata[match[1].trim().toLowerCase()] = match[2].trim();
  }
  return metadata;
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
