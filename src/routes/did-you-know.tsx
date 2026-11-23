import { createFileRoute } from "@tanstack/react-router";
import { Bar, BarChart, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useData } from "@/lib/app-state";
import { useAct1 } from "@/lib/act1-state";
import { FlagTick, FlagTooltip } from "@/lib/flags";
import { factCards } from '@/lib/did-you-know-data';
import { Button } from '@/components/ui/button';
import { PageHeader } from "@/components/shell";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";

export const Route = createFileRoute("/did-you-know")({
  head: () => ({
    meta: [
      { title: "Did you know… — Olympic birth lottery facts" },
      { name: "description", content: "Surprising facts about how birthplace shapes Olympic success." },
      { property: "og:title", content: "Did you know… — Olympic birth lottery facts" },
      { property: "og:description", content: "Surprising facts about how birthplace shapes Olympic success." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DidYouKnowPage,
});

const ACCENTS = ["border-t-ring-blue", "border-t-ring-yellow", "border-t-ring-black", "border-t-ring-green", "border-t-ring-red"];

function DidYouKnowPage() {
  const data = useData();
  const cards = factCards(data.didYouKnow);
  const act1 = useAct1();
  const nocByName = new Map((act1.editions ?? []).map(e => [e.country_name, e.team]));

  return (
    <div>
      <PageHeader title="Did you know that…" subtitle="Quick facts from the birth lottery." />
      <div className="grid items-start gap-6 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((d, i) => (
          <article key={d.id} data-fact-id={d.id} className={`min-w-0 flex flex-col rounded-xl border border-t-8 bg-card p-6 shadow-sm ${d.lists ? 'md:col-span-2 xl:col-span-3' : ''} ${ACCENTS[i % 5]}`}>
            <h2 className="text-xl font-bold uppercase">{d.kicker}</h2>
            <div data-fact-headline className="mt-2 font-display text-6xl font-extrabold">{d.headline}</div>
            <div data-fact-label className="text-sm font-semibold text-muted-foreground">{d.headline_label}</div>
            <p className="mt-3 text-lg">{d.text}</p>
            <p className="mt-2 text-xs text-muted-foreground">{d.scope}</p>
            {d.lists?.map(list => (
              <section key={list.title} className="mt-6 min-w-0">
                <h3 className="mb-2 text-lg font-bold uppercase">{list.title}</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm" aria-label={list.title}>
                    <thead><tr className="border-b">{['Rank', 'Name', 'Team', 'Sport', 'Medals', 'Years'].map(label => <th key={label} className="px-2 py-2 font-semibold">{label}</th>)}</tr></thead>
                    <tbody>{list.rows.map((row, index) => <tr key={`${row.name}-${index}`} className="border-b align-top">
                      <td className="px-2 py-2 tabular-nums">{row.rank}</td><td className="px-2 py-2 font-semibold">{row.name}</td><td className="px-2 py-2">{row.team}</td><td className="px-2 py-2">{row.sport}</td><td className="whitespace-nowrap px-2 py-2 tabular-nums">{row.medals} ({row.gold} gold)</td><td className="whitespace-nowrap px-2 py-2">{row.years}</td>
                    </tr>)}</tbody>
                  </table>
                </div>
              </section>
            ))}
            {d.chart && d.chart.data.length > 0 && (
              <div className="mt-4 min-w-0 overflow-x-auto">
                <p className="mb-2 text-xs text-muted-foreground">{d.chart.unit}</p>
                <div className={`h-64 ${d.id === 'antwerp_1920' ? 'min-w-[760px]' : ''}`}>
                <ResponsiveContainer>
                  <BarChart data={d.chart.data} margin={{ bottom: 54 }}>
                    {d.id === 'small_country_big_haul' ? <XAxis dataKey="label" interval={0} height={70} tick={(p: any) => <g transform={`translate(${p.x},${p.y + 6}) rotate(-45)`}><FlagTick x={0} y={0} label={String(p.payload.value)} noc={nocByName.get(String(p.payload.value))} /></g>} /> : <XAxis dataKey="label" interval={0} angle={-45} textAnchor="end" tick={{ fontSize: 11 }} />}<YAxis tick={{ fontSize: 12 }} width={30} />
                    {d.id === 'small_country_big_haul' ? <Tooltip content={(t: any) => <FlagTooltip {...t} nocOf={r => ({ noc: nocByName.get(String(r.label)), name: String(r.label) })} format={v => String(v)} />} /> : <Tooltip formatter={value => [value, d.chart?.unit]} />}
                    <Bar dataKey="value" name={d.chart.unit} fill="var(--ring-blue)" radius={[4, 4, 0, 0]}>
                      {d.chart.data.map((row, index) => <Cell key={`${row.label}-${index}`} fill={(d.id === 'antwerp_1920' && row.label !== '1920') || (d.id === 'small_country_big_haul' && row.label === 'United States') ? 'var(--muted-foreground)' : 'var(--ring-blue)'} />)}
                    </Bar>
                    {d.id === 'antwerp_1920' && (() => { const other = d.chart.data.filter(r => r.label !== '1920'); const avg = other.reduce((s, r) => s + r.value, 0) / other.length; return <ReferenceLine y={avg} stroke="var(--ring-red)" strokeDasharray="6 4" strokeWidth={2} label={{ value: `Average other Games: ${avg.toFixed(1)}`, position: 'insideTopRight', fontSize: 12, fill: 'var(--foreground)' }} />; })()}
                  </BarChart>
                </ResponsiveContainer>
                </div>
              </div>
            )}
            <p className="mt-auto pt-4 text-sm text-muted-foreground">{d.note}</p>
            <Collapsible className="mt-2">
              <CollapsibleTrigger asChild><Button variant="ghost" className="group h-auto whitespace-normal px-0 text-left text-sm font-semibold text-primary">
                How we calculated this <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]:rotate-180" />
              </Button></CollapsibleTrigger>
              <CollapsibleContent className="pt-2 text-sm">{d.method}</CollapsibleContent>
            </Collapsible>
          </article>
        ))}
      </div>

      <section className="mt-12 rounded-xl bg-foreground p-8 text-background">
        <div className="mb-4 h-1.5 w-40 rounded stripe" />
        <h2 className="text-4xl font-extrabold uppercase italic">How much of your medal was luck?</h2>
        <ul className="mt-6 space-y-3 text-lg">
          <li>Birthplace shapes the opportunities behind Olympic success.</li>
          <li>An athlete's birthplace and the flag they represent are not always the same.</li>
          <li>Belgian-born medallists come from across the country and can win for another flag.</li>
        </ul>
      </section>
    </div>
  );
}
