"use client";
import { useEffect, useState } from "react";
import { Activity, ArrowRight, BarChart3, Database, FileCheck2, FolderUp, Pause, Play, RotateCcw, Save, Trash2, Upload } from "lucide-react";
import { Pitch } from "@/components/Pitch";
import { BLOCKS, BlockTable, blockStats } from "@/components/BlockTable";
import { processFiles } from "@/lib/process";
import { deleteMatch, listMatches, listPlayerProfiles, saveMatch, savePlayerProfiles } from "@/lib/storage";
import { POSITION_OPTIONS, type MatchRecord, type PlayerProfile } from "@/lib/types";

type Tab = "carga" | "analisis" | "comparar";

export default function Home() {
  const [tab, setTab] = useState<Tab>("carga");
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [current, setCurrent] = useState<MatchRecord | null>(null);
  const [second, setSecond] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(5);
  const [profiles,setProfiles]=useState<PlayerProfile[]>([]);
  const refresh = () => listMatches().then(setMatches).catch(() => setMatches([]));
  useEffect(() => { refresh(); listPlayerProfiles().then(setProfiles).catch(()=>setProfiles([])); }, []);
  useEffect(() => {
    if (!playing || !current) return;
    const timer=window.setInterval(()=>setSecond(s=>s+1>current.duration?0:s+1),Math.max(50,1000/speed));
    return ()=>window.clearInterval(timer);
  }, [playing, speed, current]);
  const applyProfiles=(m:MatchRecord)=>({...m,athletes:m.athletes.map(a=>({...a,position:profiles.find(p=>p.key===a.name.toLowerCase())?.position||a.position,isGoalkeeper:(profiles.find(p=>p.key===a.name.toLowerCase())?.position||a.position)==="ARQ"}))});
  const open = (m: MatchRecord) => { setCurrent(applyProfiles(m)); setSecond(0); setTab("analisis"); };
  const updatePositions=async (updated:MatchRecord)=>{setCurrent(updated);await saveMatch(updated);const ps=updated.athletes.map(a=>({key:a.name.toLowerCase(),displayName:a.name,position:a.position,updatedAt:new Date().toISOString()}));await savePlayerProfiles(ps);setProfiles(await listPlayerProfiles());await refresh()};

  return <main>
    <header className="topbar"><div className="brand"><img src="/escudo-union.png" alt="Escudo de Unión de Santa Fe"/><div><strong>Análisis de Partidos</strong><span>Reportes &amp; WCS Integrados</span></div></div><nav>
      <button className={tab === "carga" ? "active" : ""} onClick={() => setTab("carga")}><FolderUp /> 1. Cargar</button>
      <button className={tab === "analisis" ? "active" : ""} onClick={() => setTab("analisis")} disabled={!current}><Activity /> 2. Analizar</button>
      <button className={tab === "comparar" ? "active" : ""} onClick={() => setTab("comparar")}><BarChart3 /> 3. Comparar</button>
    </nav><div className="localBadge"><Database /> Guardado en este dispositivo</div></header>
    {tab === "carga" && <UploadSection matches={matches} onCreated={async m => { await saveMatch(m); await refresh(); open(m); }} onOpen={open} onDelete={async id => { await deleteMatch(id); refresh(); }} />}
    {tab === "analisis" && current && <Analysis match={current} onUpdatePositions={updatePositions} second={second} setSecond={setSecond} playing={playing} setPlaying={setPlaying} speed={speed} setSpeed={setSpeed} />}
    {tab === "comparar" && <Compare matches={matches} />}
  </main>;
}

function UploadSection({ matches, onCreated, onOpen, onDelete }: { matches: MatchRecord[]; onCreated: (m: MatchRecord) => void; onOpen: (m: MatchRecord) => void; onDelete: (id: string) => void }) {
  const [summary, setSummary] = useState<File | null>(null), [gps, setGps] = useState<File[]>([]);
  const [opponent, setOpponent] = useState(""), [date, setDate] = useState(""), [sources, setSources] = useState(["", ""]), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const ready = summary && gps.length > 0 && opponent && date && sources.every(s => /^https?:\/\//i.test(s));
  const submit = async () => { if (!ready || !summary) return; setBusy(true); setError(""); try { onCreated(await processFiles(summary, gps, { opponent, date, sources })); } catch (e) { setError(e instanceof Error ? e.message : "No se pudieron procesar los archivos."); } finally { setBusy(false); } };
  return <section className="page uploadPage"><div className="intro"><span className="eyebrow">NUEVO ANÁLISIS</span><h1>Del GPS al partido, en un solo flujo.</h1><p>Cargá el resumen por jugador/minuto y los CSV posicionales exportados desde OpenField. La app sincroniza, normaliza el campo y guarda el partido en este navegador.</p></div>
    <div className="uploadGrid"><div className="panel mainPanel"><div className="stepTitle"><span>01</span><div><h2>Datos del partido</h2><p>Completá todos los campos para habilitar el análisis.</p></div></div>
      <div className="formGrid"><label>Rival<input value={opponent} onChange={e => setOpponent(e.target.value)} placeholder="Ej. Aldosivi" /></label><label>Fecha<input type="date" value={date} onChange={e => setDate(e.target.value)} /></label></div>
      <label className="drop"><Upload /><strong>CSV resumen</strong><span>Métricas por jugador y minuto</span><input type="file" accept=".csv,text/csv" onChange={e => setSummary(e.target.files?.[0] || null)} />{summary && <em><FileCheck2 /> {summary.name}</em>}</label>
      <label className="drop"><Upload /><strong>CSV GPS individuales</strong><span>Seleccioná todos los jugadores del mismo partido</span><input type="file" multiple accept=".csv,text/csv" onChange={e => setGps(Array.from(e.target.files || []))} />{gps.length > 0 && <em><FileCheck2 /> {gps.length} archivos seleccionados</em>}</label>
      <div className="sources"><h3>Fuentes públicas obligatorias</h3><p>Ingresá dos enlaces del mismo partido. Recomendamos SofaScore y FotMob.</p>{sources.map((s, i) => <input key={i} value={s} onChange={e => setSources(v => v.map((x, j) => j === i ? e.target.value : x))} placeholder={i ? "https://www.fotmob.com/..." : "https://www.sofascore.com/..."} />)}</div>
      {error && <p className="error">{error}</p>}<button className="primary" disabled={!ready || busy} onClick={submit}>{busy ? "Procesando…" : "Generar campograma"}<ArrowRight /></button>
    </div><CsvGuide /></div>
    <div className="saved"><div><span className="eyebrow">BIBLIOTECA LOCAL</span><h2>Partidos guardados</h2></div>{matches.length === 0 ? <div className="empty">Todavía no hay partidos guardados en este dispositivo.</div> : <div className="matchGrid">{matches.map(m => { const invalid=!m.athletes.length||!m.metrics.length; return <article key={m.id}><span>{new Date(m.date + "T12:00:00").toLocaleDateString("es-AR")}</span><h3>{m.name}</h3><p>{m.athletes.length} GPS · {m.metrics.length} registros</p>{invalid&&<p className="error">Carga inválida: eliminá este registro y volvé a cargar los archivos correctos.</p>}<div><button disabled={invalid} onClick={() => onOpen(m)}>{invalid?"Sin datos para analizar":"Abrir análisis"}</button><button className="iconBtn" aria-label="Eliminar" onClick={() => onDelete(m.id)}><Trash2 /></button></div></article>})}</div>}</div>
  </section>;
}

function CsvGuide() { return <aside className="panel guide"><span className="eyebrow">FORMATO ESPERADO</span><h2>Antes de exportar</h2><div className="guideItem"><b>1</b><div><strong>Resumen por minuto</strong><p>Una fila por jugador y minuto. Debe contener Athlete/Jugador, Minute, Total Distance o Mts/min, Mts &gt;19, Mts &gt;24, A+D y Velocidad máxima.</p></div></div><div className="codeSample"><span>Athlete, Minute, Total Distance, Mts/min</span><span>L Menossi, 12, 118.4, 118.4</span></div><div className="guideItem"><b>2</b><div><strong>GPS individual</strong><p>Un CSV por jugador con Timestamp absoluto, Seconds, Velocity, Acceleration, Latitude, Longitude y Positional Quality.</p></div></div><div className="codeSample"><span>Timestamp, Seconds, Velocity, Latitude…</span><span>2026-08-23 18:02:01, 1, 12.4, -31…</span></div><div className="notice"><strong>Importante</strong><p>No mezcles entrenamientos u otros partidos. Usá el mismo período y zona horaria para todos los dispositivos.</p></div></aside> }

function Analysis({ match, onUpdatePositions, second, setSecond, playing, setPlaying, speed, setSpeed }: { match: MatchRecord; onUpdatePositions:(m:MatchRecord)=>void; second: number; setSecond: (v: number) => void; playing: boolean; setPlaying: (v: boolean) => void; speed: number; setSpeed: (v: number) => void }) {
  const minute = Math.floor(second / 60) + 1, activeBlock = BLOCKS.findIndex(([a,b]) => minute >= a && minute <= b);
  const minuteRows = match.metrics.filter(m => m.minute === minute && m.position !== "ARQ").sort((a,b) => b.mtsMin-a.mtsMin);
  return <section className="page analysis"><div className="analysisHead"><div><span className="eyebrow">PARTIDO · {match.date}</span><h1>{match.name}</h1></div><div className="kpis"><div><span>Tiempo GPS</span><strong>{Math.floor(match.duration/60)}′</strong></div><div><span>Jugadores</span><strong>{match.athletes.length}</strong></div><div><span>Bloque activo</span><strong>{activeBlock >= 0 ? `${BLOCKS[activeBlock][0]}–${BLOCKS[activeBlock][1]}′` : "—"}</strong></div></div></div>
    <PositionEditor match={match} onSave={onUpdatePositions}/>
    <Pitch match={match} second={Math.round(second)} />
    <div className="controls"><button className="round" onClick={() => setPlaying(!playing)}>{playing ? <Pause /> : <Play />}</button><button onClick={() => setSecond(Math.max(0, second-5))}>−5 s</button><button onClick={() => setSecond(Math.max(0, second-1))}>−1 s</button><input aria-label="Tiempo" type="range" min="0" max={match.duration} step="1" value={Math.round(second)} onChange={e => {setPlaying(false);setSecond(Number(e.target.value))}}/><button onClick={() => setSecond(Math.min(match.duration, second+1))}>+1 s</button><button onClick={() => setSecond(Math.min(match.duration, second+5))}>+5 s</button><select value={speed} onChange={e => setSpeed(Number(e.target.value))}>{[1,2,5,10,20].map(x => <option key={x} value={x}>×{x}</option>)}</select><button className="round secondary" onClick={() => {setPlaying(false);setSecond(0)}}><RotateCcw /></button></div>
    <div className="analysisGrid"><div className="panel"><h2>Tabla del minuto {minute}</h2><div className="tableScroll"><table><thead><tr><th>Jugador</th><th>POS</th><th>Mts/min</th><th>A+D</th><th>&gt;19</th><th>&gt;24</th><th>Vel. máx.</th></tr></thead><tbody>{minuteRows.map((r,i) => <tr key={r.athlete} className={i===0 ? "activeRow":""}><td>{r.athlete}</td><td>{r.position}</td><td>{r.mtsMin.toFixed(1)}</td><td>{r.ad.toFixed(1)}</td><td>{r.hs19.toFixed(1)}</td><td>{r.hs24.toFixed(1)}</td><td>{r.maxSpeed.toFixed(1)}</td></tr>)}</tbody></table></div></div><div className="panel"><h2>Control de calidad</h2>{match.warnings.length ? match.warnings.map(w => <p className="warning" key={w}>{w}</p>) : <p className="ok">Sin alertas críticas de estructura.</p>}<p className="sourceNote">Fuentes registradas: {match.sources.length}</p></div></div>
    <div className="panel blockPanel"><h2>Rendimiento colectivo por bloques</h2><p>Hacé clic en un bloque para llevar el reproductor a ese momento.</p><BlockTable match={match} active={activeBlock} onSelect={i => setSecond((BLOCKS[i][0]-1)*60)} /></div>
    <WcsTable match={match} />
  </section>;
}

function PositionEditor({match,onSave}:{match:MatchRecord;onSave:(m:MatchRecord)=>void}){
  const [draft,setDraft]=useState(()=>Object.fromEntries(match.athletes.map(a=>[a.id,a.position])));
  useEffect(()=>setDraft(Object.fromEntries(match.athletes.map(a=>[a.id,a.position]))),[match.id]);
  const missing=match.athletes.filter(a=>(draft[a.id]||a.position)==="SIN POS.").length;
  return <details className="panel positionEditor" open={missing>0}><summary><div><span className="eyebrow">PLANTEL DEL PARTIDO</span><h2>Asignar posiciones</h2></div><strong>{missing?`${missing} sin asignar`:"Posiciones completas"}</strong></summary><p>La posición queda guardada para próximos partidos y siempre puede modificarse.</p><div className="positionGrid">{match.athletes.map(a=><label key={a.id}><span>{a.name}</span><select value={draft[a.id]||a.position} onChange={e=>setDraft(v=>({...v,[a.id]:e.target.value}))}>{POSITION_OPTIONS.map(p=><option key={p} value={p}>{p}</option>)}</select></label>)}</div><button className="primary" onClick={()=>onSave({...match,athletes:match.athletes.map(a=>({...a,position:draft[a.id]||a.position,isGoalkeeper:(draft[a.id]||a.position)==="ARQ"}))})}><Save/> Guardar posiciones</button></details>
}

function WcsTable({ match }: { match: MatchRecord }) {
  const field = match.metrics.filter(m => m.position !== "ARQ");
  const players = [...new Set(field.map(m => m.athlete))];
  const peak = (window: number, key: "mtsMin"|"hs19"|"hs24"|"ad") => {
    let best = { value: 0, from: 0 };
    for (const player of players) {
      const rows = field.filter(m => m.athlete === player).sort((a,b)=>a.minute-b.minute);
      for (let i=0;i<=rows.length-window;i++) {
        const slice=rows.slice(i,i+window);
        if (slice.at(-1)!.minute-slice[0].minute!==window-1) continue;
        const value=slice.reduce((sum,r)=>sum+r[key],0)/window;
        if(value>best.value) best={value,from:slice[0].minute};
      }
    }
    return best;
  };
  return <div className="panel blockPanel"><div className="wcsHead"><div><span className="eyebrow">WORST-CASE SCENARIOS</span><h2>Ventanas pico móviles</h2></div><span>Promedio máximo individual · arquero excluido</span></div><div className="tableScroll"><table><thead><tr><th>Ventana</th><th>Mts/min pico</th><th>Inicio</th><th>&gt;19 pico</th><th>&gt;24 pico</th><th>A+D pico</th></tr></thead><tbody>{[1,3,5,10].map(w=>{const mts=peak(w,"mtsMin"),h19=peak(w,"hs19"),h24=peak(w,"hs24"),ad=peak(w,"ad");return <tr key={w}><td>{w}′</td><td>{mts.value.toFixed(1)}</td><td>{mts.from || "—"}′</td><td>{h19.value.toFixed(1)}</td><td>{h24.value.toFixed(1)}</td><td>{ad.value.toFixed(1)}</td></tr>})}</tbody></table></div></div>;
}

function Compare({ matches }: { matches: MatchRecord[] }) {
  const [leftId,setLeftId]=useState(""), [rightId,setRightId]=useState(""), [block,setBlock]=useState(0), [note,setNote]=useState("");
  const left=matches.find(m=>m.id===leftId), right=matches.find(m=>m.id===rightId); const second=(BLOCKS[block][0]-1)*60;
  return <section className="page compare"><div className="intro small"><span className="eyebrow">COMPARACIÓN SINCRONIZADA</span><h1>Dos partidos. El mismo momento.</h1><p>Elegí dos encuentros y navegá por bloques: ambos campogramas se posicionan automáticamente en el mismo tramo.</p></div><div className="compareSelectors"><select value={leftId} onChange={e=>setLeftId(e.target.value)}><option value="">Elegir partido A</option>{matches.map(m=><option key={m.id} value={m.id}>{m.name} · {m.date}</option>)}</select><span>VS</span><select value={rightId} onChange={e=>setRightId(e.target.value)}><option value="">Elegir partido B</option>{matches.map(m=><option key={m.id} value={m.id}>{m.name} · {m.date}</option>)}</select></div>
    {left&&right ? <><div className="blockPicker">{BLOCKS.map((b,i)=><button key={i} className={block===i?"active":""} onClick={()=>setBlock(i)}>{b[0]}–{b[1]===120?"final":b[1]}′</button>)}</div><div className="dualPitch"><div><h3>{left.name}</h3><Pitch match={left} second={second} compact /></div><div><h3>{right.name}</h3><Pitch match={right} second={second} compact /></div></div><ComparisonTable left={left} right={right} block={block}/><div className="panel notes"><h2>Notas contextuales del bloque</h2><p>Registrá expulsiones, lesiones, cambios tácticos, pausas o cualquier suceso que ayude a interpretar la intensidad.</p><textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="Ej. Expulsión rival al 24′; Unión pasó a defender en bloque medio…"/><button className="primary"><Save/> Guardar nota en este análisis</button></div></> : <div className="empty large">Necesitás al menos dos partidos guardados para iniciar la comparación.</div>}
  </section>;
}

function ComparisonTable({left,right,block}:{left:MatchRecord;right:MatchRecord;block:number}) { const a=blockStats(left,block), b=blockStats(right,block); const diff=(x:number,y:number)=>x?((y-x)/x*100):0; return <div className="panel"><h2>Comparación del bloque</h2><div className="tableScroll"><table><thead><tr><th>Métrica</th><th>{left.opponent}</th><th>{right.opponent}</th><th>Dif. %</th></tr></thead><tbody><tr><td>Mts/min promedio</td><td>{a.mts.toFixed(1)}</td><td>{b.mts.toFixed(1)}</td><td>{diff(a.mts,b.mts).toFixed(1)}%</td></tr><tr><td>Mts &gt;19 promedio</td><td>{a.h19.toFixed(1)}</td><td>{b.h19.toFixed(1)}</td><td>{diff(a.h19,b.h19).toFixed(1)}%</td></tr><tr><td>Mts &gt;24 promedio</td><td>{a.h24.toFixed(1)}</td><td>{b.h24.toFixed(1)}</td><td>{diff(a.h24,b.h24).toFixed(1)}%</td></tr></tbody></table></div></div> }
