import { Switch } from "@/components/ui/switch";
import { CountryName } from '@/lib/flags';
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { RankMedal } from "@/lib/rank-medal";
import { FlagTick, FlagTooltip } from "@/lib/flags";
import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { X } from "lucide-react";
import { useFilters } from "@/lib/app-state";
import { realActsQuery, act2Lists, act2Migration, act2MapCoverage, competitionRank, fmtMedals, fmtNet, fmtShare, type Act2Row } from "@/lib/real-acts";
import { Empty, PageHeader } from "@/components/shell";
import { WorldMap, MigrationLines } from "@/components/world-map";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/migration")({
  loader: ({ context }) => context.queryClient.ensureQueryData(realActsQuery),
  head: () => ({
    meta: [
      { title: "Escaping the lottery — Olympic talent migration" },
      { name: "description", content: "Which countries export and import Olympic medal talent." },
      { property: "og:title", content: "Escaping the lottery — Olympic talent migration" },
      { property: "og:description", content: "Which countries export and import Olympic medal talent." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Migration,
});

function Migration() {
  const { data } = useSuspenseQuery(realActsQuery);
  const [f] = useFilters();
  const m = useMemo(() => act2Migration(data.act2,f),[data,f.games,f.from,f.to]);
  const coverage = act2MapCoverage(m.rows,data.mapping);
  const [selected,setSelected] = useState<string|null>(null);
   const selectedRow = [...coverage.drawn,...coverage.markers].find(r=>r.noc_code===selected);
  const [currentOnly,setCurrentOnly] = useState(true);
  const { importers, exporters, shares } = useMemo(() => act2Lists(data.act2,f,currentOnly),[data,f.games,f.from,f.to,f.min,currentOnly]);
  const bars = [...importers.slice(0,10),...exporters.slice(0,10).reverse()].map(r=>r.row);
  return <div>
    <PageHeader title="Escaping the lottery" subtitle="Where Olympic medals travel when athletes compete for another country." />
    <p className="mb-8 border-l-4 border-primary bg-accent/40 p-4 text-sm leading-relaxed">Migration = born in another country than the one you compete for. Born in a predecessor or successor state (e.g. Ukraine → Soviet Union) is NOT migration. Birth countries use today's borders. Medals with an unknown birth country are neither imported nor exported.</p>
    {!m.rows.length ? <Empty/> : !importers.length && !exporters.length ? <p className="py-12 text-muted-foreground">No team has at least {f.min} medals in this selection.</p> : <>
      <div className="mb-6"><label className="flex items-center gap-3 text-sm font-medium"><Switch checked={currentOnly} onCheckedChange={setCurrentOnly} aria-label="Current countries only"/>Current countries only</label></div><div className="grid gap-8 lg:grid-cols-2"><RankTable title="Top net importers" rows={importers}/><RankTable title="Top net exporters" rows={exporters}/></div>
      <div className="mt-8"><RankTable title="Highest share won by foreign-born athletes" rows={shares} share/></div>
      <section className="mt-10 border-t pt-6"><h2 className="mb-4 text-3xl font-bold uppercase">The talent map</h2>
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_310px]">
           <WorldMap rows={coverage.drawn} markers={coverage.markers} selected={selected} onSelect={setSelected}/>
           <aside className="border-l pl-4">{selectedRow ? <><div className="flex items-center justify-between gap-2"><h3 className="text-2xl font-bold"><CountryName noc={selectedRow.noc_code} name={selectedRow.country_name} current={selectedRow.code_status==='current'} /></h3><Button variant="ghost" size="icon" aria-label="Close country details" onClick={()=>setSelected(null)}><X className="size-4"/></Button></div><MigrationLines r={selectedRow}/></> : <p className="text-sm text-muted-foreground">{coverage.drawn.length+coverage.markers.length} current teams shown · {fmtMedals(m.medals)} medals won</p>}</aside>
        </div>
         {coverage.unmatched.length>0 && <p className="mt-4 text-xs text-muted-foreground">Current teams still missing from the map: {coverage.unmatched.map(r=>`${r.country_name} (${r.noc_code}): ${fmtNet(r.net)} medals`).join('; ')}.</p>}
        <p className="mt-3 text-xs text-muted-foreground">Historical teams (e.g. Soviet Union, ROC) are not on the map but are included in the tables.</p>
      </section>
      <section className="mt-10 border-t pt-6"><h2 className="text-3xl font-bold uppercase">Who gains, who loses</h2><p className="mb-4 text-sm text-muted-foreground">Top 10 net importers and top 10 net exporters · medals</p>
        <div className="h-[650px] w-full"><ResponsiveContainer><BarChart data={bars} layout="vertical" margin={{left:0,right:25}}><CartesianGrid horizontal={false} strokeDasharray="3 3"/><XAxis type="number" tick={{fontSize:12}}/><YAxis type="category" dataKey="country_name" width={190} interval={0} tick={(p:any)=>{const r=bars[p.index];return <FlagTick x={p.x} y={p.y} label={r?.country_name??String(p.payload.value)} noc={r?.noc_code} current={r?.code_status==='current'}/>;}}/><ReferenceLine x={0} stroke="var(--muted-foreground)"/><Tooltip content={(t:any)=><FlagTooltip {...t} nocOf={r=>({noc:String(r.noc_code),name:String(r.country_name),current:r.code_status==='current'})} format={v=>fmtNet(Number(v))}/>}/><Bar dataKey="net" name="Net imported">{bars.map(r=><Cell key={r.noc_code} fill={r.net>0?'var(--gain)':'var(--loss)'}/>)}</Bar></BarChart></ResponsiveContainer></div>
      </section>
    </>}
  </div>;
}
function RankTable({title,rows,share=false}:{title:string;rows:{row:Act2Row;rank:number}[];share?:boolean}){
  return <section className="min-w-0"><h2 className="mb-3 text-2xl font-bold uppercase">{title}</h2><div className="max-h-[460px] overflow-auto border-y"><table className="w-full text-sm"><thead className="sticky top-0 z-10 bg-card text-xs text-muted-foreground"><tr>{['Rank','Country','Medals won','Imported',...(share?['Share %']:['Exported','Net imported'])].map((h,i)=><th key={h} className={`px-2 py-3 ${i<2?'text-left':'text-right'}`}>{h}</th>)}</tr></thead><tbody>{rows.map(({row:r,rank})=><tr key={r.noc_code} className="border-b last:border-0"><td className="px-2 py-2 font-bold whitespace-nowrap"><RankMedal rank={rank} />{rank}</td><td className="px-2 py-2"><CountryName noc={r.noc_code} name={r.country_name} current={r.code_status==='current'} />{r.code_status!=='current'&&<span className="ml-2 inline-block rounded-sm bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">{r.code_status}</span>}</td><td className="px-2 py-2 text-right tabular-nums">{fmtMedals(r.medals_won)}</td><td className="px-2 py-2 text-right tabular-nums">{fmtMedals(r.imported_medals)}</td>{share?<td className="px-2 py-2 text-right font-bold tabular-nums">{fmtShare(r.share)}</td>:<><td className="px-2 py-2 text-right tabular-nums">{fmtMedals(r.exported_medals)}</td><td className={`px-2 py-2 text-right font-bold tabular-nums ${r.net>0?'text-gain':'text-loss'}`}>{fmtNet(r.net)}</td></>}</tr>)}</tbody></table></div></section>;
}
