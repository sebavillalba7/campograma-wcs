import type { MatchRecord, MinuteMetric } from "./types";

export const WCS_WINDOWS = [1, 3, 5, 10] as const;
export type WcsMetric = "mtsMin" | "hs19" | "ad";
export type PeakRow = { scope:string; athlete:string; position:string; window:number; metric:string; value:number; startMinute:number; endMinute:number; half:string; validMinutes:number };

const metricLabels:Record<WcsMetric,string>={mtsMin:"Mts/min",hs19:"Mts >19/min",ad:"A+D >2,5/min"};
const isField=(r:MinuteMetric)=>r.position!=="ARQ";
const halfOf=(minute:number)=>minute<=50?"1T":"2T";

function peakFromSeries(series:{minute:number;periodMinute:number;half:string;value:number}[],window:number){
  let best:{value:number;startMinute:number;endMinute:number;half:string}|null=null;
  for(let i=0;i<=series.length-window;i++){
    const slice=series.slice(i,i+window);
    const sameHalf=slice[0].half===slice.at(-1)!.half;
    const contiguous=slice.every((r,j)=>j===0||r.periodMinute===slice[j-1].periodMinute+1);
    if(!sameHalf||!contiguous)continue;
    const value=slice.reduce((s,r)=>s+r.value,0)/window;
    if(!best||value>best.value)best={value,startMinute:slice[0].minute,endMinute:slice.at(-1)!.minute,half:slice[0].half};
  }
  return best;
}

export function calculateWcs(match:MatchRecord){
  const field=match.metrics.filter(isField);
  const minuteKeys=[...new Set(field.map(r=>`${r.half||halfOf(r.minute)}|${r.periodMinute||r.minute}`))];
  const teamByMinute=minuteKeys.map(key=>{const [half,pm]=key.split("|");const periodMinute=Number(pm);
    const rows=field.filter(r=>(r.half||halfOf(r.minute))===half&&(r.periodMinute||r.minute)===periodMinute); const minute=rows[0]?.minute||periodMinute;
    const avg=(key:WcsMetric)=>rows.reduce((s,r)=>s+r[key],0)/rows.length;
    return {minute,periodMinute,half,count:rows.length,mtsMin:avg("mtsMin"),hs19:avg("hs19"),ad:avg("ad")};
  }).sort((a,b)=>a.half.localeCompare(b.half)||a.periodMinute-b.periodMinute);
  const team:PeakRow[]=[],players:PeakRow[]=[];
  for(const window of WCS_WINDOWS)for(const metric of Object.keys(metricLabels) as WcsMetric[]){
    const peak=peakFromSeries(teamByMinute.map(r=>({minute:r.minute,periodMinute:r.periodMinute,half:r.half,value:r[metric]})),window);
    if(peak)team.push({scope:"Equipo",athlete:"Promedio jugadores activos",position:"—",window,metric:metricLabels[metric],...peak,validMinutes:teamByMinute.length});
  }
  const names=[...new Set(field.map(r=>r.athlete))];
  for(const athlete of names){
    const rows=field.filter(r=>r.athlete===athlete).sort((a,b)=>a.minute-b.minute);
    for(const window of WCS_WINDOWS)for(const metric of Object.keys(metricLabels) as WcsMetric[]){
      const peak=peakFromSeries(rows.map(r=>({minute:r.minute,periodMinute:r.periodMinute||r.minute,half:r.half||halfOf(r.minute),value:r[metric]})),window);
      if(peak)players.push({scope:"Jugador",athlete,position:rows[0]?.position||"SIN POS.",window,metric:metricLabels[metric],...peak,validMinutes:rows.length});
    }
  }
  const validMinutes=names.map(athlete=>{const rows=field.filter(r=>r.athlete===athlete);return {Jugador:athlete,Posición:rows[0]?.position||"SIN POS.","Minutos válidos":new Set(rows.map(r=>r.minute)).size,"Primer minuto":Math.min(...rows.map(r=>r.minute)),"Último minuto":Math.max(...rows.map(r=>r.minute))}});
  return {team,players,validMinutes};
}

export async function exportWcsExcel(match:MatchRecord){
  const XLSX=await import("xlsx");
  const {team,players,validMinutes}=calculateWcs(match);
  const makeRows=(rows:PeakRow[])=>rows.map(r=>({Ámbito:r.scope,Jugador:r.athlete,Posición:r.position,"Ventana (min)":r.window,Métrica:r.metric,"Rolling average máximo":Number(r.value.toFixed(3)),"Minuto inicial":r.startMinute,"Minuto final":r.endMinute,Tiempo:r.half,"Minutos válidos":r.validMinutes}));
  const wb=XLSX.utils.book_new();
  const sheets:[[string,Record<string,unknown>[]],...Array<[string,Record<string,unknown>[]]>]=[["Equipo",makeRows(team)],["Jugadores",makeRows(players)],["Minutos válidos",validMinutes]];
  sheets.forEach(([name,rows])=>{const ws=XLSX.utils.json_to_sheet(rows);ws["!autofilter"]={ref:ws["!ref"]||"A1:A1"};ws["!cols"]=[{wch:16},{wch:28},{wch:16},{wch:14},{wch:22},{wch:24},{wch:15},{wch:15},{wch:10},{wch:16}];XLSX.utils.book_append_sheet(wb,ws,name)});
  const safe=`wcs-${match.opponent}-${match.date}`.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9-]+/g,"-");
  XLSX.writeFile(wb,`${safe}.xlsx`,{compression:true});
}
