"use client";
import type { MatchRecord } from "@/lib/types";

const norm = (s:string)=>s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9 ]/g,"").trim();
const samePlayer=(a:string,b:string)=>{const x=norm(a).split(" "),y=norm(b).split(" ");return norm(a)===norm(b)||x.at(-1)===y.at(-1)};
function nearest(points: MatchRecord["athletes"][number]["points"], second:number){let lo=0,hi=points.length-1;while(lo<hi){const mid=Math.floor((lo+hi)/2);if(points[mid].t<second)lo=mid+1;else hi=mid}const a=points[lo],b=points[Math.max(0,lo-1)];return !b||Math.abs(a.t-second)<Math.abs(b.t-second)?a:b}

export function Pitch({ match, second, compact = false }: { match: MatchRecord; second: number; compact?: boolean }) {
  const minute=Math.floor(second/60)+1;
  const activeNames=match.metrics.filter(m=>m.minute===minute).map(m=>m.athlete);
  const isActive=(name:string)=>activeNames.some(n=>samePlayer(n,name));
  const firstHalfPlayers=match.athletes.filter(a=>match.metrics.some(m=>m.minute<=45&&samePlayer(m.athlete,a.name)));
  const sideAverage=(positions:string[])=>{const values=firstHalfPlayers.filter(a=>positions.includes(a.position)).flatMap(a=>a.points.filter(p=>p.t<=45*60).map(p=>p.y));return values.length?values.reduce((s,v)=>s+v,0)/values.length:null};
  const left=sideAverage(["DEF CEN I","DEF LAT I"]),right=sideAverage(["DEF CEN D","DEF LAT D"]);
  const flipY=left!==null&&right!==null&&left>right;
  const players = match.athletes.filter(a=>isActive(a.name)).map(a => ({ a, p: nearest(a.points,second) })).filter(x => x.p && Math.abs(x.p.t - second) <= 2);
  const keeper=players.find(x=>x.a.position==="ARQ"); const attackRight=keeper?keeper.p.x<52.5:true;
  return <div className={`pitchWrap ${compact ? "compact" : ""}`}>
    <svg className="pitch" viewBox="0 0 105 70" role="img" aria-label="Campograma del partido">
      <rect x=".5" y=".5" width="104" height="69" rx="1" className="grass" />
      <path d="M52.5 0V70 M52.5 35m-9.15 0a9.15 9.15 0 1 0 18.3 0a9.15 9.15 0 1 0-18.3 0 M0 13.85h16.5v42.3H0 M105 13.85H88.5v42.3H105 M0 24.05h5.5v21.9H0 M105 24.05h-5.5v21.9H105" className="lines" />
      <circle cx="52.5" cy="35" r=".5" className="spot" />
      {players.map(({ a, p }) => <g key={a.id} transform={`translate(${p.x} ${flipY?70-p.y:p.y})`}>
        <circle r="2.05" className={a.isGoalkeeper ? "keeper" : "player"} />
        <text y="-.1" className="posText">{a.position}</text>
        {!compact && <text y="4.5" className="nameText">{a.name.split(" ").slice(-1)}</text>}
      </g>)}
    </svg>
    <div className="pitchFooter"><span>Ataque {attackRight?"→":"←"}</span><strong>{Math.floor(second / 60)}:{String(second % 60).padStart(2, "0")}</strong><span>{players.length} GPS activos</span></div>
  </div>;
}
