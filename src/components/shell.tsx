import { Link, useLocation } from "@tanstack/react-router";
import { Button } from '@/components/ui/button';
import { Info } from "lucide-react";
import type { ReactNode } from "react";
import { useData, useFilters } from "@/lib/app-state";
import { Slider } from "@/components/ui/slider";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";

const NAV = [
  { to: "/", label: "Birth Lottery" },
  { to: "/rankings", label: "1 · Where you're born" },
  { to: "/migration", label: "2 · Escaping" },
  { to: "/belgium", label: "3 · Close to home" },
  { to: "/did-you-know", label: "Did you know" },
  { to: "/methods", label: "Data & methods" },
] as const;

/** Pages that still display sample data (methods page: sources, lineage, generation time come from sample metadata.json). */
export const SAMPLE_DATA_PAGES: readonly string[] = [];

export function SampleBanner() {
  const { metadata } = useData();
  const path = useLocation().pathname;
  if (!metadata.is_sample || !SAMPLE_DATA_PAGES.includes(path)) return null;
  return (
    <div className="bg-warning py-1 text-center text-xs font-bold uppercase tracking-widest text-warning-foreground">
      Sample data – not real results
    </div>
  );
}

export function TopNav() {
  return (
    <header className="border-b bg-card">
      <div className="h-1.5 stripe" />
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
        <Link to="/" search={(p) => p} className="font-display text-2xl font-extrabold uppercase italic tracking-tight">
          Born to Win<span className="text-primary">?</span>
        </Link>
        <nav className="flex flex-wrap gap-1">
          {NAV.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              search={(p) => p}
              activeOptions={{ exact: true, includeSearch: false }}
              className="rounded-md px-3 py-1.5 text-sm font-semibold text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground data-[status=active]:bg-primary data-[status=active]:text-primary-foreground"
            >
              {n.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}

export function FilterBar() {
  const path = useLocation().pathname;
  const { metadata } = useData();
  const [f, set] = useFilters();
  const g = metadata.games_covered;
  const isRankings = path === '/rankings';
  const isRealAct = isRankings || path === '/' || path === '/migration' || path === '/belgium';
  const isBirthAct = path === '/migration' || path === '/belgium';
  if (path === '/validate' || path === '/did-you-know') return null;
  return (
    <div className="sticky top-0 z-30 border-b bg-card/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-8 gap-y-3 px-4 py-3 text-sm">
        <FilterLabel label="Games">
          <ToggleGroup type="single" variant="outline" size="sm" value={f.games} onValueChange={(v) => v && set({ games: v as typeof f.games })}>
            {["All", "Summer", "Winter"].map((x) => <ToggleGroupItem key={x} value={x} className="px-3">{(isRankings || path === '/') && x === 'All' ? 'All Games' : x}</ToggleGroupItem>)}
          </ToggleGroup>
        </FilterLabel>
        <FilterLabel label={`Years ${f.from}–${f.to}`}>
          <Slider className="w-48" min={g.from} max={g.to} step={1} value={[f.from, f.to]}
            onValueChange={([a, b]) => set({ from: a ?? g.from, to: b ?? g.to })} aria-label="Year range" />
        </FilterLabel>
        {isRealAct && <div className="flex flex-wrap gap-2"><Button variant="outline" size="sm" onClick={() => set({ from: 1994, to: 2024 })}>Modern era (1994–2024)</Button><Button variant="outline" size="sm" onClick={() => set({ from: 1896, to: 2024 })}>All time (1896–2024)</Button></div>}
        {!isRealAct && <FilterLabel
          label="Team medals"
          info="Once per team matches the official medal table. Once per athlete counts every team member, which boosts countries strong in team sports and changes the rankings."
        >
          <ToggleGroup type="single" variant="outline" size="sm" value={f.counting} onValueChange={(v) => v && set({ counting: v as typeof f.counting })}>
            <ToggleGroupItem value="team" className="px-3">Once per team (official)</ToggleGroupItem>
            <ToggleGroupItem value="athlete" className="px-3">Once per athlete</ToggleGroupItem>
          </ToggleGroup>
        </FilterLabel>}
        {path !== '/belgium' && <FilterLabel label="Min. medals" info="Countries with fewer medals are hidden from the rankings and migration tables so micro-states with one medal don't dominate.">
          <Input type="number" min={0} className="h-8 w-20" value={f.min} onChange={(e) => set({ min: Math.max(0, Number(e.target.value) || 0) })} aria-label="Minimum medals" />
        </FilterLabel>}
      </div>
    </div>
  );
}

function FilterLabel({ label, info, children }: { label: string; info?: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
        {label}
        {info && <InfoTip text={info} />}
      </span>
      {children}
    </div>
  );
}

export function InfoTip({ text }: { text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button type="button" aria-label="More info" className="rounded-full text-muted-foreground hover:text-primary focus-visible:text-primary">
          <Info className="h-3.5 w-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs text-sm">{text}</TooltipContent>
    </Tooltip>
  );
}

export function PageHeader({ act, title, subtitle, lesson }: { act?: string; title: string; subtitle: string; lesson?: string }) {
  return (
    <div className="mb-8">
      {act && <div className="text-sm font-bold uppercase tracking-[0.2em] text-primary">{act}</div>}
      <h1 className="text-5xl font-extrabold uppercase italic md:text-6xl">{title}</h1>
      <p className="mt-2 max-w-3xl text-lg text-muted-foreground">{subtitle}</p>
      {lesson && <LessonTag text={lesson} />}
    </div>
  );
}

export function LessonTag({ text }: { text: string }) {
  return (
    <div className="mt-3 inline-flex items-start gap-2 rounded-md border border-ring-yellow/60 bg-ring-yellow/10 px-3 py-1.5 text-xs">
      <span className="font-bold uppercase tracking-wider">Data-management lesson</span>
      <span className="text-muted-foreground">{text}</span>
    </div>
  );
}

export function ChartCard({ title, what, caption, children, className = "" }: { title: string; what: string; caption?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-xl border bg-card p-5 shadow-sm ${className}`}>
      <h2 className="text-2xl font-bold uppercase">{title}</h2>
      <p className="mb-4 text-sm text-muted-foreground"><span className="font-semibold text-foreground">What this shows:</span> {what}</p>
      {children}
      {caption && <p className="mt-3 text-xs text-muted-foreground">{caption}</p>}
    </section>
  );
}

export function Empty({ text = "No medals match these filters. Try widening the year range or switching Games." }: { text?: string }) {
  return <div className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">{text}</div>;
}

export function MedalBadge({ kind, value }: { kind: "gold" | "silver" | "bronze"; value: string }) {
  const cls = { gold: "bg-gold/25 border-gold", silver: "bg-silver/25 border-silver", bronze: "bg-bronze/25 border-bronze" }[kind];
  return <span className={`inline-block min-w-10 rounded-full border px-2 py-0.5 text-center text-xs font-bold tabular-nums ${cls}`}>{value}</span>;
}

export function DenomCaption({ kind }: { kind: "pop" | "gdp" }) {
  const { metadata: m } = useData();
  return kind === "pop"
    ? <>Medal score = 3×gold + 2×silver + 1×bronze, per 1 million inhabitants (population {m.population_year}).</>
    : <>Medal score = 3×gold + 2×silver + 1×bronze, per US$100 billion GDP ({m.gdp_year}, {m.gdp_unit}).</>;
}

export function FractionNote() {
  const [f] = useFilters();
  if (f.counting !== "team") return null;
  return <InfoTip text="Fractions appear because a team medal is split between the birth countries of its members." />;
}
