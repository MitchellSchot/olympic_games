import { RankMedal } from "@/lib/rank-medal";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState, useEffect } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { geoMercator, geoPath } from "d3-geo";
import { scaleLinear } from "d3-scale";
import { useData, useFilters } from "@/lib/app-state";
import { athleteAct3Query, athleteProvinces, rankAthleteProvinces, ATHLETE_WINNERS_NOTE, type AthleteProvince } from "@/lib/act3-athlete";
import { PageHeader, MedalBadge } from "@/components/shell";
import type { FeatureCollection } from "geojson";

export const Route = createFileRoute("/belgium")({
  loader: ({ context }) => context.queryClient.ensureQueryData(athleteAct3Query),
  head: () => ({
    meta: [
      { title: "Close to home — Belgian-born Olympic medallists" },
      { name: "description", content: "Athlete-count Olympic medals by Belgian province of birth." },
      { property: "og:title", content: "Close to home — Belgian-born Olympic medallists" },
      { property: "og:description", content: "Athlete-count Olympic medals by Belgian province of birth." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Belgium,
});

function Belgium() {
  const data = useData();
  const { data: real } = useSuspenseQuery(athleteAct3Query);
  const [f] = useFilters();
  const p = useMemo(()=>athleteProvinces(real,data.provinces,f),[real,data.provinces,f.games,f.from,f.to]);
  const max = Math.max(1,...p.areas.map(r=>r.medals));
  const [palette, setPalette] = useState<string[] | null>(null);
  useEffect(() => {
    const css = getComputedStyle(document.documentElement);
    setPalette(["--province-low", "--province-mid", "--province-high"].map(key => css.getPropertyValue(key).trim()));
  }, []);
  const color = palette ? scaleLinear<string>().domain([0,max/2,max]).range(palette).clamp(true) : null;
  const [hover,setHover] = useState<{r:AthleteProvince;x:number;y:number}|null>(null);
  const box = useRef<HTMLDivElement>(null);
  useEffect(()=>setHover(null),[f.games,f.from,f.to]);
  const move = (r:AthleteProvince)=>(e:React.MouseEvent|React.FocusEvent)=>{
    if(!box.current)return;
    const b=box.current.getBoundingClientRect(),t=e.currentTarget.getBoundingClientRect();
    setHover({r,x:Math.max(0,Math.min(('clientX' in e?e.clientX:t.x+t.width/2)-b.left+12,b.width-230)),y:('clientY' in e?e.clientY:t.y+t.height/2)-b.top+12});
  };
  return <div>
    <PageHeader title="Close to home" subtitle="Olympic medals won by Belgian-born athletes, wherever they competed."/>
    <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_440px]">
      <section><h2 className="mb-4 text-2xl font-bold uppercase">Medal map of Belgium</h2>
        <div ref={box} className="relative">
          {data.belgiumGeo ? <GeoMap geo={data.belgiumGeo} rows={p.areas} fill={r=>color ? color(r.medals) : "var(--province-low)"} onHover={move} onLeave={()=>setHover(null)}/> : <p className="py-12 text-muted-foreground">Province borders could not be loaded.</p>}
          {hover&&<div className="pointer-events-none absolute z-20 w-[230px] rounded-md border bg-popover p-3 text-sm shadow-lg" style={{left:hover.x,top:hover.y}}><h3 className="text-xl font-bold">{hover.r.name}</h3><div>Gold <b>{hover.r.gold}</b></div><div>Silver <b>{hover.r.silver}</b></div><div>Bronze <b>{hover.r.bronze}</b></div><div>Total medals <b>{hover.r.medals}</b></div><div>Medal winners <b>{hover.r.winners??'–'}</b></div>{hover.r.winners===null&&<p className="mt-1 text-xs text-muted-foreground">{ATHLETE_WINNERS_NOTE}</p>}</div>}
          <div className="mt-3 flex items-center gap-2 text-xs"><span>0</span><div className="h-3 w-40 rounded-sm bg-[image:var(--province-scale)]"/><span>{max} medals</span></div>
        </div>
      </section>
      <section><h2 className="mb-4 text-2xl font-bold uppercase">Ranking by medals</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b text-xs text-muted-foreground">{['Rank','Area','Gold','Silver','Bronze','Total'].map(label=><th key={label} className={`pb-3 pr-2 ${label==='Area'?'text-left':'text-right'}`}>{label}</th>)}</tr></thead>
            <tbody>{rankAthleteProvinces(p.areas).map(({row:r,rank})=><tr key={r.nis} className="border-b"><td className="py-3 pr-2 text-right font-bold whitespace-nowrap"><RankMedal rank={rank} />{rank}</td><td className="py-3 pr-2">{r.name}</td>{(['gold','silver','bronze'] as const).map(kind=><td key={kind} className="py-3 pr-2 text-right"><MedalBadge kind={kind} value={String(r[kind])}/></td>)}<td className="py-3 text-right font-bold tabular-nums">{r.medals}</td></tr>)}</tbody>
            <tfoot><tr className="border-l-4 border-neutral bg-muted"><td className="py-3 pr-2"/><td className="py-3 pr-2">Unknown</td>{(['gold','silver','bronze'] as const).map(kind=><td key={kind} className="py-3 pr-2 text-right tabular-nums">{p.unknown[kind]}</td>)}<td className="py-3 text-right font-bold tabular-nums">{p.unknown.medals}</td></tr></tfoot>
          </table>
        </div>
      </section>
    </div>
    {p.unmatched.length>0&&<p className="mt-4 text-sm text-muted-foreground">Unmatched province names: {p.unmatched.map(r=>`${r.name} (${r.medals} medals)`).join(', ')}.</p>}
  </div>;
}
function GeoMap({geo,rows,fill,onHover,onLeave}:{geo:FeatureCollection;rows:AthleteProvince[];fill:(r:AthleteProvince)=>string;onHover:(r:AthleteProvince)=>(e:React.MouseEvent|React.FocusEvent)=>void;onLeave:()=>void}){
  const by=new Map(rows.map(r=>[r.nis,r]));
  const path=geoPath(geoMercator().fitExtent([[12,12],[588,488]],geo));
  return <svg viewBox="0 0 600 500" className="h-auto w-full" aria-label="Belgian provinces by medals">{geo.features.map((ft,i)=>{const r=by.get(String(ft.properties?.['nis']));return <path key={i} data-province={r?.nis} d={path(ft)??''} fill={r?fill(r):'var(--neutral)'} stroke="var(--card)" strokeWidth={1.5} tabIndex={r?0:-1} aria-label={r?`${r.name}: ${r.medals} medals`:undefined} className="cursor-pointer outline-none focus:stroke-foreground" onMouseMove={r?onHover(r):undefined} onFocus={r?onHover(r):undefined} onMouseLeave={onLeave} onBlur={onLeave}/>;})}</svg>;
}
