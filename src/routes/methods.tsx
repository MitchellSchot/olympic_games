import { createFileRoute } from "@tanstack/react-router";
import { Fragment } from "react";
import { ArrowRight, ExternalLink } from "lucide-react";
import { PageHeader } from "@/components/shell";

export const Route = createFileRoute("/methods")({
  head: () => ({
    meta: [
      { title: "Data & methods — Born to Win?" },
      { name: "description", content: "Sources, lineage, data quality and calculation definitions." },
      { property: "og:title", content: "Data & methods — Born to Win?" },
      { property: "og:description", content: "Sources, lineage, data quality and calculation definitions." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Methods,
});

const STEPS = [
  { stage: "Open Data package", info: "315,761 rows, 48 columns (.xlsx)" },
  { stage: "Fabric Lakehouse raw", info: "raw_olympic_athletes, all columns loaded as text (source preserved)" },
  { stage: "Fabric analysis tables", info: "analysis_athlete_medal_birth_vs_represented (44,860 athlete-medal rows = 21,245 official medals); analysis_country_edition_economy (one row per country per Games); analysis_belgian_birthplace_medals (450 medals of Belgian-born athletes)" },
  { stage: "Export notebooks", info: "nb_06_export_act1, nb_07_export_act2_act3, nb_08_export_did_you_know → JSON files" },
  { stage: "This app", info: "static JSON files, checked on /validate" },
];
const QUALITY: [string, string, string, string][] = [
  ["Medal totals vs independent medal table", "Total per Games equals a second, independently built medal table", "Pass", "0"],
  ["Act 1 current countries", "Historical teams (Soviet Union, East Germany, …) excluded from per-capita/per-GDP rankings", "Expected", "2,514 of 21,245 medals (11.8%)"],
  ["Missing population (since 1994)", "Country-Games without population skipped for per capita", "Warning", "17 medals (0.18%)"],
  ["Missing GDP (since 1994)", "Country-Games without GDP skipped for per GDP; Georgia has no GDP in the source", "Warning", "75 medals (0.78%)"],
  ["Impossible values", "Population or GDP ≤ 0", "Pass", "0"],
  ["Independent recalculation Act 1", "All 12 rankings recalculated outside Fabric and compared", "Pass", "712 of 712 rows identical"],
  ["Migration balance", "Imported medals = exported medals worldwide (1,353.5 all years; 650.3 since 1994)", "Pass", "0"],
  ["Unknown birth country", "Medals without a known birth country (neither imported nor exported)", "Warning", "388.7 medals (1.8%)"],
  ["Belgian-born medals, two tables", "Province table and migration table give the same total (174.72)", "Pass", "0"],
  ["Medal colour", "Medal column agrees with points (gold 3, silver 2, bronze 1)", "Pass", "0 of 450 rows"],
  ["Unknown Belgian province", "Belgian-born medals without a province", "Warning", "67 of 450 medals (15%)"],
  ["Duplicate athlete IDs", "Ledecky and McKeon (14 medals each) missing from the Hall of fame top 10 — likely split IDs for 2024", "Open", "under investigation"],
  ["Demo vs Fabric", "/validate compares every page with the Fabric results", "Pass", "all checks"],
];
const resultCls: Record<string, string> = { Pass: "text-gain", Warning: "text-warning-foreground", Open: "text-loss", Expected: "text-muted-foreground" };

function Methods() {
  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <PageHeader title="Data & methods" subtitle="Where the numbers come from and how we computed them." />
        <div className="text-sm text-muted-foreground">Data exported from our Microsoft Fabric Lakehouse (Born_to_win) on 8–9 November 2026</div>
      </div>

      <section>
        <h2 className="mb-4 text-3xl font-bold uppercase">Sources</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border bg-card p-5 md:col-span-2">
            <div className="text-lg font-bold">Olympic Athletes &amp; Global Inequality: A Historical Dataset (1896–2024)</div>
            <div className="text-sm text-muted-foreground">G. Oonk, Erasmus University Rotterdam (DataverseNL), version V1, 2026</div>
            <div className="mt-2 text-sm">Licence: CC0 1.0 (public domain)</div>
            <div className="text-sm">Accessed: 5 November 2026</div>
            <div className="text-sm">Size: 315,761 rows × 48 columns (one row per athlete per event)</div>
            <div className="mt-3 text-sm font-semibold">Built from</div>
            <ul className="list-disc pl-5 text-sm">
              <li>Olympedia (athletes, results, birthplaces)</li>
              <li>Gapminder GDP per capita and GDP total, PPP constant 2021 international $ (GD001 v31)</li>
              <li>Gapminder population (GD003), with World Bank SP.POP.TOTL where Gapminder had no figure</li>
            </ul>
            <a href="https://doi.org/10.34894/Q4KJSW" target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-sm text-primary underline">https://doi.org/10.34894/Q4KJSW <ExternalLink className="h-3 w-3" /></a>
          </div>
          <div className="rounded-xl border bg-card p-4">
            <div className="font-bold">Map shapes</div>
            <p className="mt-2 text-sm">World map: world-atlas (Natural Earth, public domain).</p>
            <p className="mt-2 text-sm">Belgium provinces: Statistics Belgium (Statbel) administrative boundaries via geoBoundaries (BEL ADM2), licence ODbL 1.0.</p>
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-3xl font-bold uppercase">Lineage</h2>
        <div className="flex flex-wrap items-stretch gap-2">
          {STEPS.map((s, i) => (
            <Fragment key={s.stage}>
              <div className="w-56 rounded-lg border-2 border-primary/30 bg-card p-3 text-center">
                <div className="text-xs font-bold text-primary">{i + 1}</div>
                <div className="font-display text-lg font-bold uppercase">{s.stage}</div>
                <div className="break-words text-xs text-muted-foreground">{s.info}</div>
              </div>
              {i < STEPS.length - 1 && <ArrowRight className="h-5 w-5 self-center text-primary" />}
            </Fragment>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-3xl font-bold uppercase">Data quality</h2>
        <div className="overflow-x-auto">
          <table className="w-full rounded-xl border bg-card text-sm">
            <thead className="border-b text-left text-xs uppercase text-muted-foreground"><tr><th className="p-3">Check</th><th className="p-3">What we checked</th><th className="p-3">Result</th><th className="p-3 text-right">Rows affected</th></tr></thead>
            <tbody>{QUALITY.map(([c, d, r, n]) => (
              <tr key={c} className="border-b last:border-0"><td className="p-3 font-semibold">{c}</td><td className="p-3">{d}</td><td className={`p-3 font-bold ${resultCls[r]}`}>{r}</td><td className="p-3 text-right tabular-nums">{n}</td></tr>
            ))}</tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border bg-card p-5">
          <h2 className="mb-2 text-2xl font-bold uppercase">Calculations</h2>
          <ul className="list-disc space-y-1 pl-5 text-sm">
            <li><b>Medal score</b> = 3 × gold + 2 × silver + 1 × bronze.</li>
            <li><b>Act 1 per capita</b> = medal score ÷ population of each Games year, summed over the selected Games (sum ÷ sum), × 1,000,000. <b>Per GDP</b> = the same with GDP (PPP, constant 2021 international $), × 100 billion. Never an average of per-Games ratios.</li>
            <li>Act 1: only current countries; at least 10 medals per measure; Games without population or GDP are skipped for that measure only.</li>
            <li>Acts 1 and 2: a team medal counts once (official medal table), split over its members.</li>
            <li>Act 3 and Hall of fame: every medal counts fully for each athlete (a relay gold = 1 gold per runner).</li>
            <li>Act 3: Belgian-born athletes for any team; the 1956 Equestrian Games are excluded; no per-inhabitant figures (province population not in the source).</li>
          </ul>
        </div>
        <div className="rounded-xl border bg-card p-5">
          <h2 className="mb-2 text-2xl font-bold uppercase">Migration definitions</h2>
          <ul className="list-disc space-y-1 pl-5 text-sm">
            <li><b>Imported</b>: won for a country by athletes born in another country.</li>
            <li><b>Exported</b>: won for another country by athletes born here.</li>
            <li><b>Net imported</b> = imported − exported. <b>Share won by foreign-born</b> = imported ÷ medals won (only for ≥ 10 medals).</li>
            <li>Born in a predecessor or successor state (e.g. Ukraine → Soviet Union) is not migration. Birth countries use today's borders.</li>
            <li>Medals with an unknown birth country are neither imported nor exported.</li>
          </ul>
        </div>
      </section>

      <p className="text-xs text-muted-foreground">The demo shows athlete names only on the Hall of fame and age cards (name, team, sport, medals, years). No birth dates, birthplaces or other personal data are shown.</p>
    </div>
  );
}
