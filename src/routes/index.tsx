import { CountryName } from '@/lib/flags';
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import ringsGif from "@/assets/olympic-fire-rings.gif.asset.json";
import { useData, useFilters } from "@/lib/app-state";
import { useSuspenseQuery } from '@tanstack/react-query';
import { landingAct1Top, landingAct2Top } from '@/lib/landing-cards';
import { realActsQuery, fmtNet } from '@/lib/real-acts';
import { athleteAct3Query, landingAct3Card } from '@/lib/act3-athlete';
import { MedalBadge, InfoTip } from "@/components/shell";
import { useAct1 } from '@/lib/act1-state';
import { legendAthlete } from '@/lib/did-you-know-data';
import { fmtAct1Ratio } from '@/lib/data';

export const Route = createFileRoute("/")({
  loader: ({ context }) => Promise.all([context.queryClient.ensureQueryData(realActsQuery), context.queryClient.ensureQueryData(athleteAct3Query)]),
  head: () => ({
    meta: [
      { title: "Born to Win? — The Birth Lottery" },
      { name: "description", content: "How much of an Olympic medal is decided before you're born? An interactive look at birthplace, wealth and migration." },
      { property: "og:title", content: "Born to Win? — The Birth Lottery" },
      { property: "og:description", content: "How much of an Olympic medal is decided before you're born?" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const data = useData();
  const [f] = useFilters();
  const { editions } = useAct1();
  const { data: real } = useSuspenseQuery(realActsQuery);
  const realTop = editions !== null ? landingAct1Top(editions, f) : undefined;
  const mig = landingAct2Top(real.act2, f);
  const { data: athlete } = useSuspenseQuery(athleteAct3Query);
  const prov = landingAct3Card(athlete, data.provinces, f);
  const legend = legendAthlete(data.didYouKnow);

  const cards = [
    { act: "Act 1", title: "Where you're born", to: "/rankings" as const, color: "bg-ring-blue",
      num: realTop ? fmtAct1Ratio(realTop.points_ratio) : '–', label: realTop ? <><CountryName noc={realTop.team} name={realTop.country_name} code={false} />: medal score per 1M inhabitants (#1)</> : `No country has at least ${f.min} medals in this selection`,
      lesson: "Reference data & integration: NOC vs ISO codes, which population do you divide by?" },
    { act: "Act 2", title: "Escaping the lottery", to: "/migration" as const, color: "bg-ring-yellow",
      num: mig ? fmtNet(mig.net) : "–", label: mig ? <><CountryName noc={mig.noc_code} name={mig.country_name} current={mig.code_status === 'current'} code={false} />: largest net imported medals</> : `No team has at least ${f.min} medals and a net import in this selection`,
      lesson: "Master data: what is a country?" },
    { act: "Act 3", title: "Close to home", to: "/belgium" as const, color: "bg-ring-green",
      num: prov ? String(prov.medals) : "–", label: prov ? prov.label : "No Belgian medals in this selection", medals: prov,
      minInfo: true, lesson: "Metadata & geodata: place names, coordinate precision" },
    { act: "Legend", title: "Most decorated Olympian", to: "/did-you-know" as const, color: "bg-ring-red",
      num: legend ? String(legend.medals) : "–", label: legend ? `${legend.name} · ${legend.team} · ${legend.sport}` : "No data",
      medals: legend ?? undefined, minInfo: true, lesson: null },
  ];

  return (
    <div>
      <section className="relative py-8">
        <RingsGif />
        <div className="text-sm font-bold uppercase tracking-[0.3em] text-primary">The Birth Lottery</div>
        <h1 className="mt-2 text-6xl font-extrabold uppercase italic leading-[0.9] md:text-8xl">
          Born to win?
        </h1>
        <p className="mt-4 max-w-3xl font-display text-3xl font-semibold text-muted-foreground">
          How much of an Olympic medal is decided before you're born?
        </p>
        <div className="mt-8 h-2 w-64 rounded-full stripe" />
      </section>

      <section className="mt-8 grid gap-6 md:grid-cols-2">
        {cards.map((c) => (
          <Link key={c.act} to={c.to} search={c.act === 'Legend' ? {} : (p) => p}
            className="group relative overflow-hidden rounded-xl border bg-card p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg focus-visible:ring-2 focus-visible:ring-ring">
            <div className={`absolute inset-y-0 left-0 w-2 ${c.color}`} />
            <h2 className="text-4xl font-extrabold uppercase italic">{c.title}{'minInfo' in c && c.minInfo && <span className="ml-2 align-middle text-base not-italic normal-case"><InfoTip text="The minimum-medals filter applies to countries only." /></span>}</h2>
            <div className="mt-4 font-display text-6xl font-extrabold tabular-nums">{c.num}</div>
            <div className="text-muted-foreground">{c.label}</div>
            {'medals' in c && c.medals && <div className="mt-2 flex flex-wrap gap-2">{(['gold','silver','bronze'] as const).map(k => <MedalBadge key={k} kind={k} value={String(c.medals?.[k])} />)}</div>}
            <ArrowRight className="absolute right-6 top-6 h-6 w-6 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
          </Link>
        ))}
      </section>
    </div>
  );
}

// Restart the GIF every 5 seconds by reloading it under a fresh URL.
function RingsGif() {
  const [n, setN] = useState(0);
  useEffect(() => { const id = setInterval(() => setN(x => x + 1), 5000); return () => clearInterval(id); }, []);
  return <img key={n} src={n ? `${ringsGif.url}?r=${n}` : ringsGif.url} alt="Olympic rings on fire" className="pointer-events-none absolute right-0 top-4 hidden w-[min(36vw,460px)] lg:block" />;
}
