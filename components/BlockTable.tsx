"use client";
import type { MatchRecord, MinuteMetric } from "@/lib/types";

export const BLOCKS = [[1,10],[11,20],[21,30],[31,40],[41,50],[51,60],[61,70],[71,80],[81,90],[91,120]];
export function blockStats(match: MatchRecord, b: number) {
  const [from, to] = BLOCKS[b];
  const rows = match.metrics.filter(m => m.position !== "ARQ" && m.minute >= from && m.minute <= to);
  const avg = (f: (x: MinuteMetric) => number) => rows.length ? rows.reduce((a, x) => a + f(x), 0) / rows.length : 0;
  const max = (f: (x: MinuteMetric) => number) => rows.length ? Math.max(...rows.map(f)) : 0;
  return { mts: avg(x => x.mtsMin), mtsMax: max(x => x.mtsMin), h19: avg(x => x.hs19), h19Max: max(x => x.hs19), h24: avg(x => x.hs24), h24Max: max(x => x.hs24) };
}

export function BlockTable({ match, active, onSelect }: { match: MatchRecord; active: number; onSelect: (i: number) => void }) {
  return <div className="tableScroll"><table><thead><tr><th>Bloque</th><th>Mts/min</th><th>Máx.</th><th>Mts &gt;19</th><th>Máx.</th><th>Mts &gt;24</th><th>Máx.</th></tr></thead><tbody>
    {BLOCKS.map((b, i) => { const s = blockStats(match, i); return <tr key={i} className={i === active ? "activeRow" : ""} onClick={() => onSelect(i)}><td><button>{b[0]}–{b[1] === 120 ? "final" : b[1]}′</button></td><td>{s.mts.toFixed(1)}</td><td>{s.mtsMax.toFixed(1)}</td><td>{s.h19.toFixed(1)}</td><td>{s.h19Max.toFixed(1)}</td><td>{s.h24.toFixed(1)}</td><td>{s.h24Max.toFixed(1)}</td></tr> })}
  </tbody></table></div>;
}
