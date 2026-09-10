"use client";
import type { MatchRecord } from "@/lib/types";

export function Pitch({ match, second, compact = false }: { match: MatchRecord; second: number; compact?: boolean }) {
  const players = match.athletes.map(a => ({ a, p: a.points.reduce((best, p) => Math.abs(p.t - second) < Math.abs(best.t - second) ? p : best, a.points[0]) })).filter(x => x.p && Math.abs(x.p.t - second) <= 2);
  return <div className={`pitchWrap ${compact ? "compact" : ""}`}>
    <svg className="pitch" viewBox="0 0 105 70" role="img" aria-label="Campograma del partido">
      <rect x=".5" y=".5" width="104" height="69" rx="1" className="grass" />
      <path d="M52.5 0V70 M52.5 35m-9.15 0a9.15 9.15 0 1 0 18.3 0a9.15 9.15 0 1 0-18.3 0 M0 13.85h16.5v42.3H0 M105 13.85H88.5v42.3H105 M0 24.05h5.5v21.9H0 M105 24.05h-5.5v21.9H105" className="lines" />
      <circle cx="52.5" cy="35" r=".5" className="spot" />
      {players.map(({ a, p }) => <g key={a.id} transform={`translate(${p.x} ${p.y})`}>
        <circle r="2.05" className={a.isGoalkeeper ? "keeper" : "player"} />
        <text y="-.1" className="posText">{a.position}</text>
        {!compact && <text y="4.5" className="nameText">{a.name.split(" ").slice(-1)}</text>}
      </g>)}
    </svg>
    <div className="pitchFooter"><span>Ataque →</span><strong>{Math.floor(second / 60)}:{String(second % 60).padStart(2, "0")}</strong><span>{players.length} GPS activos</span></div>
  </div>;
}
