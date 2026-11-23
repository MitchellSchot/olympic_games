import { createFileRoute } from '@tanstack/react-router';
import { useAct1 } from '@/lib/act1-state';
import { ACT1_LABELS, validateAct1Rankings } from '@/lib/data';
import { useSuspenseQuery } from '@tanstack/react-query';
import { useData } from '@/lib/app-state';
import { validateFlags, validateChartFlags } from '@/lib/flags';
import { act1Rankings } from '@/lib/data';
import { act2Lists } from '@/lib/real-acts';
import { validateLandingMin } from '@/lib/landing-cards';
import { validateRankMedals } from '@/lib/rank-medal';
import { useFilters } from '@/lib/app-state';
import { SAMPLE_DATA_PAGES } from '@/components/shell';
import { realActsQuery, validateRealActs, type ValidationCheck } from '@/lib/real-acts';
import { validateDidYouKnow, legendAthlete, validateLegendCard } from '@/lib/did-you-know-data';
import { athleteAct3Query, validateAthleteAct3, validateLandingAct3 } from '@/lib/act3-athlete';
export const Route = createFileRoute('/validate')({
  loader: ({ context }) => Promise.all([context.queryClient.ensureQueryData(realActsQuery), context.queryClient.ensureQueryData(athleteAct3Query)]),
  head: () => ({ meta: [{ title: 'Olympic data validation — Born to Win?' }, { name: 'description', content: 'Validate Act 1 rankings, Act 2 migration and Act 3 province totals against the original exports.' }, { property: 'og:title', content: 'Olympic data validation — Born to Win?' }, { property: 'og:description', content: 'Reference checks for Olympic rankings, migration and Belgian province medals.' }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' }] }), component: Validation,
});
function Validation() {
  const { editions, reference } = useAct1();
  return <div><h1 className="mb-6 text-4xl font-bold">Act 1 validation</h1>{editions === null || reference === null ? <p className="mt-6">Both Act 1 exports must be available before validation.</p> : <div className="mt-6 overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left">{['Measure','Option','Season','Reference rows','App rows','Mismatches','Result'].map(x => <th key={x} className="p-3">{x}</th>)}</tr></thead><tbody>{validateAct1Rankings(editions, reference).map(c => <tr key={`${c.measure}${c.option}${c.season}`} className="border-b align-top"><td className="p-3" title={ACT1_LABELS[c.measure]}>{c.measure === 'per_capita' ? 'Per capita' : 'Per GDP'}</td><td className="p-3">{c.option}</td><td className="p-3">{c.season}</td><td className="p-3">{c.referenceRows}</td><td className="p-3">{c.appRows}</td><td className="p-3">{c.mismatches.length > 0 ? <details><summary>{c.mismatches.length}</summary><ul className="mt-2 min-w-64 space-y-2">{c.mismatches.map((m,i) => <li key={i}>{m}</li>)}</ul></details> : 0}</td><td className={`p-3 font-bold ${c.mismatches.length ? 'text-loss' : 'text-gain'}`}>{c.mismatches.length ? 'FAIL' : 'PASS'}</td></tr>)}</tbody></table></div>}<RealValidation/></div>;
}

function RealValidation(){
  const {data}=useSuspenseQuery(realActsQuery);
  const {data:athleteData}=useSuspenseQuery(athleteAct3Query);
  const {provinces}=useData();
  const checks=validateRealActs(data,provinces);
  const {didYouKnow}=useData();
  return <><CheckTable title="Act 2 validation · All Games" checks={checks.act2}/><CheckTable title="Act 3 validation · All Games" checks={validateAthleteAct3(athleteData,provinces)}/><CheckTable title="Landing page · Act 3 card" checks={validateLandingAct3(athleteData,provinces)}/><CheckTable title="Did you know" checks={validateDidYouKnow(didYouKnow)}/><CheckTable title="Landing page · Legend card" checks={validateLegendCard(didYouKnow,legendAthlete(didYouKnow))}/><CheckTable title="Landing cards · Min. medals" checks={validateLandingMin(useAct1().editions ?? [], data.act2)}/><CheckTable title="Top-3 medal icons · current filters" checks={validateRankMedals(useAct1().editions ?? [], data.act2, useFilters()[0])}/><CheckTable title="Chart country labels · flags (current filters)" checks={(()=>{const f=useFilters()[0];const a1=act1Rankings(useAct1().editions ?? [],"per_capita",f).rows.slice(0,15).map(r=>({chart:"Where you're born top 15",label:r.country_name,noc:r.team}));const l=act2Lists(data.act2,f);const a2=[...l.importers.slice(0,10),...l.exporters.slice(0,10)].map(({row:r})=>({chart:"Who gains, who loses",label:r.country_name,noc:r.noc_code,current:r.code_status==="current"}));return validateChartFlags([...a1,...a2]);})()}/><CheckTable title="Country flags" checks={validateFlags([...(useAct1().editions ?? []).map(e=>e.team), ...data.act2.filter(r=>r.code_status==='current').map(r=>r.noc_code)])}/><CheckTable title="Pages using sample data" checks={[{check:'Pages still showing sample data',expected:'None',actual:SAMPLE_DATA_PAGES.length?SAMPLE_DATA_PAGES.join(', '):'None',pass:SAMPLE_DATA_PAGES.length===0}]}/></>;
}
function CheckTable({title,checks}:{title:string;checks:ValidationCheck[]}){
  return <section className="mt-10 border-t pt-6"><h2 className="text-3xl font-bold">{title}</h2><p className="my-3 text-sm text-muted-foreground">{checks.filter(c=>c.pass).length} / {checks.length} checks pass</p><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left">{['Check','Expected','App value','Result'].map(h=><th key={h} className="p-3">{h}</th>)}</tr></thead><tbody>{checks.map(c=><tr key={c.check} className="border-b align-top"><td className="p-3">{c.check}</td><td className="p-3">{c.expected}</td><td className="p-3">{c.actual}</td><td className={`p-3 font-bold ${c.pass?'text-gain':'text-loss'}`}>{c.pass?'PASS':'FAIL'}</td></tr>)}</tbody></table></div></section>;
}