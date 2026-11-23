import type { FeatureCollection } from "geojson";
import { validateDidYouKnowFile, type DidYouKnow } from './did-you-know-data';
export type { DidYouKnow } from './did-you-know-data';
// Single source of truth for data loading, validation and aggregation.
export type Season = "Summer" | "Winter";
export type Medal = "gold" | "silver" | "bronze";

export interface Metadata {
  is_sample: boolean;
  generated_at: string;
  games_covered: { from: number; to: number };
  population_year: number;
  gdp_year: number;
  gdp_unit: string;
  sources: { name: string; publisher: string; url: string; licence: string; accessed: string }[];
  lineage: { stage: string; fabric_item: string; description: string; row_count: number }[];
  quality_checks: { check: string; description: string; result: string; rows_affected: number }[];
  known_limitations: string[];
  ai_disclosure: string;
}
export interface Country { iso3: string; iso_numeric: string; name: string; population: number; gdp_usd: number }
export interface MedalFact {
  year: number; season: Season; represented_iso3: string; birth_iso3: string | null;
  medal: Medal; athlete_medals: number; team_medals: number;
}
export interface BelgiumFact {
  year: number; season: Season; province_nis: string; represented_iso3: string;
  medal: Medal; athlete_medals: number; team_medals: number;
}
export interface Province { nis: string; name_en: string; name_nl: string; name_fr: string; region: string; population: number }
export interface AppData {
  metadata: Metadata; countries: Country[]; facts: MedalFact[]; belgium: BelgiumFact[];
  provinces: Province[]; didYouKnow: DidYouKnow[]; belgiumGeo: FeatureCollection | null;
}

export class DataFileError extends Error {
  constructor(public file: string, message: string) { super(message); }
}

async function load<T>(file: string, check: (d: unknown) => string | null): Promise<T> {
  let res: Response;
  try { res = await fetch(`/data/${file}`); } catch { throw new DataFileError(file, "Could not be fetched."); }
  if (!res.ok) throw new DataFileError(file, `File missing (HTTP ${res.status}).`);
  let json: unknown;
  try { json = await res.json(); } catch { throw new DataFileError(file, "File is not valid JSON."); }
  const err = check(json);
  if (err) throw new DataFileError(file, err);
  return json as T;
}
const arrayOf = (keys: string[]) => (d: unknown) => {
  if (!Array.isArray(d)) return "Expected a JSON array.";
  if (d.length === 0) return null;
  const missing = keys.filter((k) => !(k in (d[0] as object)));
  return missing.length ? `Missing field(s): ${missing.join(", ")}.` : null;
};

export async function loadAll(): Promise<AppData> {
  const [metadata, countries, facts, belgium, provinces, didYouKnow, belgiumGeo] = await Promise.all([
    load<Metadata>("metadata.json", (d) =>
      d && typeof d === "object" && "games_covered" in d && "is_sample" in d ? null : "Missing games_covered or is_sample."),
    load<Country[]>("countries.json", arrayOf(["iso3", "iso_numeric", "name", "population", "gdp_usd"])),
    load<MedalFact[]>("medal_facts.json", arrayOf(["year", "season", "represented_iso3", "birth_iso3", "medal", "athlete_medals", "team_medals"])),
    load<BelgiumFact[]>("belgium_facts.json", arrayOf(["year", "season", "province_nis", "represented_iso3", "medal"])),
    load<Province[]>("provinces.json", arrayOf(["nis", "name_en", "population"])),
    load<DidYouKnow[]>("did_you_know.json", validateDidYouKnowFile),
    fetch("/data/geo/belgium_provinces.geojson")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => (j && j.type === "FeatureCollection" ? (j as FeatureCollection) : null))
      .catch(() => null),
  ]);
  return { metadata, countries, facts, belgium, provinces, didYouKnow, belgiumGeo };
}

// ---------- Filters ----------
export type Counting = "team" | "athlete";
export interface Filters { games: "All" | Season; from: number; to: number; counting: Counting; min: number }

export function applyFilters<T extends { year: number; season: Season }>(rows: T[], f: Filters): T[] {
  return rows.filter((r) => r.year >= f.from && r.year <= f.to && (f.games === "All" || r.season === f.games));
}
export const value = (r: { athlete_medals: number; team_medals: number }, c: Counting) =>
  c === "team" ? r.team_medals : r.athlete_medals;

// ---------- Calculations ----------
export const MEDAL_POINTS: Record<Medal, number> = { gold: 3, silver: 2, bronze: 1 };
export interface Tally { gold: number; silver: number; bronze: number; score: number; total: number }
export const emptyTally = (): Tally => ({ gold: 0, silver: 0, bronze: 0, score: 0, total: 0 });
export function addTo(t: Tally, medal: Medal, v: number) {
  t[medal] += v; t.total += v; t.score += MEDAL_POINTS[medal] * v;
}
export const perMillion = (score: number, pop: number) => (pop > 0 ? score / (pop / 1e6) : 0);
export const perHundredBn = (score: number, gdp: number) => (gdp > 0 ? score / (gdp / 1e11) : 0);

export function tallyBy<T extends { medal: Medal; athlete_medals: number; team_medals: number }>(
  rows: T[], key: (r: T) => string | null, c: Counting,
): Map<string, Tally> {
  const m = new Map<string, Tally>();
  for (const r of rows) {
    const k = key(r);
    if (k == null) continue;
    if (!m.has(k)) m.set(k, emptyTally());
    addTo(m.get(k)!, r.medal, value(r, c));
  }
  return m;
}

export interface MigrationRow {
  iso3: string; name: string; represented: Tally; birth: Tally;
  homegrown: number; import: number; export: number; net: number;
}
export function migration(data: AppData, f: Filters) {
  const rows = applyFilters(data.facts, f);
  const rep = tallyBy(rows, (r) => r.represented_iso3, f.counting);
  const birth = tallyBy(rows, (r) => r.birth_iso3, f.counting);
  const imp = new Map<string, number>(), exp = new Map<string, number>(), home = new Map<string, number>();
  const flows = new Map<string, Map<string, number>>(); // birth -> represented -> score
  let unknown = 0, total = 0;
  for (const r of rows) {
    const s = MEDAL_POINTS[r.medal] * value(r, f.counting);
    total += s;
    if (!r.birth_iso3) { unknown += s; continue; }
    if (r.birth_iso3 === r.represented_iso3) home.set(r.birth_iso3, (home.get(r.birth_iso3) ?? 0) + s);
    else {
      imp.set(r.represented_iso3, (imp.get(r.represented_iso3) ?? 0) + s);
      exp.set(r.birth_iso3, (exp.get(r.birth_iso3) ?? 0) + s);
      if (!flows.has(r.birth_iso3)) flows.set(r.birth_iso3, new Map());
      const fm = flows.get(r.birth_iso3)!;
      fm.set(r.represented_iso3, (fm.get(r.represented_iso3) ?? 0) + s);
    }
  }
  const list: MigrationRow[] = data.countries.map((c) => {
    const i = imp.get(c.iso3) ?? 0, e = exp.get(c.iso3) ?? 0;
    return {
      iso3: c.iso3, name: c.name, represented: rep.get(c.iso3) ?? emptyTally(), birth: birth.get(c.iso3) ?? emptyTally(),
      homegrown: home.get(c.iso3) ?? 0, import: i, export: e, net: i - e,
    };
  });
  const topExports = (iso: string) =>
    [...(flows.get(iso) ?? new Map()).entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  const topImports = (iso: string) => {
    const out: [string, number][] = [];
    flows.forEach((m, b) => { const v = m.get(iso); if (v) out.push([b, v]); });
    return out.sort((a, b) => b[1] - a[1]).slice(0, 5);
  };
  return { list, unknown, total, topExports, topImports };
}

export interface RankingRow extends Tally { iso3: string; name: string; perCapita: number; perGdp: number; absRank: number }
export function rankings(data: AppData, f: Filters) {
  const t = tallyBy(applyFilters(data.facts, f), (r) => r.represented_iso3, f.counting);
  const all = data.countries.map((c) => {
    const x = t.get(c.iso3) ?? emptyTally();
    return { ...x, iso3: c.iso3, name: c.name, perCapita: perMillion(x.score, c.population), perGdp: perHundredBn(x.score, c.gdp_usd), absRank: 0 };
  });
  [...all].sort((a, b) => b.score - a.score).forEach((r, i) => (r.absRank = i + 1));
  const shown = all.filter((r) => r.total >= f.min && r.total > 0);
  return { rows: shown, hidden: all.filter((r) => r.total > 0).length - shown.length };
}

export interface ProvinceRow extends Tally { nis: string; province: Province; perCapita: number; foreign: number }
export function belgiumProvinces(data: AppData, f: Filters) {
  const rows = applyFilters(data.belgium, f);
  const t = tallyBy(rows, (r) => r.province_nis, f.counting);
  const foreign = new Map<string, number>();
  let unknown = 0;
  for (const r of rows) {
    const s = MEDAL_POINTS[r.medal] * value(r, f.counting);
    if (r.province_nis === "unknown") unknown += s;
    if (r.represented_iso3 !== "BEL") foreign.set(r.province_nis, (foreign.get(r.province_nis) ?? 0) + s);
  }
  const list: ProvinceRow[] = data.provinces.map((p) => {
    const x = t.get(p.nis) ?? emptyTally();
    return { ...x, nis: p.nis, province: p, perCapita: perMillion(x.score, p.population), foreign: foreign.get(p.nis) ?? 0 };
  });
  return { list, unknown };
}

// ---------- Formatting ----------
const int = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const one = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });
const two = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const fmtCount = (n: number) => (Number.isInteger(n) ? int.format(n) : one.format(n));
export const fmtRatio = (n: number) => two.format(n);
export const fmtSigned = (n: number) => (n > 0 ? "+" : n < 0 ? "−" : "") + fmtCount(Math.abs(n));
export const flag = (iso3: string, countries: Country[]) => {
  const map: Record<string, string> = ISO2;
  const a2 = map[iso3];
  if (!a2) return "🏳️";
  return String.fromCodePoint(...[...a2].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
  void countries;
};
const ISO2: Record<string, string> = {
  USA: "US", GBR: "GB", FRA: "FR", DEU: "DE", ITA: "IT", NLD: "NL", BEL: "BE", SWE: "SE", NOR: "NO", FIN: "FI",
  DNK: "DK", CHE: "CH", AUT: "AT", ESP: "ES", PRT: "PT", POL: "PL", HUN: "HU", CZE: "CZ", ROU: "RO", UKR: "UA",
  RUS: "RU", CHN: "CN", JPN: "JP", KOR: "KR", AUS: "AU", NZL: "NZ", CAN: "CA", BRA: "BR", ARG: "AR", MEX: "MX",
  CUB: "CU", JAM: "JM", KEN: "KE", ETH: "ET", NGA: "NG", MAR: "MA", ZAF: "ZA", IND: "IN", TUR: "TR", IRN: "IR",
  GRC: "GR", LIE: "LI", IRL: "IE", LUX: "LU", ISR: "IL", EGY: "EG", COL: "CO", CHL: "CL", SRB: "RS", HRV: "HR",
  SVK: "SK", SVN: "SI", BGR: "BG", BLR: "BY", KAZ: "KZ", UZB: "UZ", GEO: "GE", AZE: "AZ", ARM: "AM", EST: "EE",
  LVA: "LV", LTU: "LT", ISL: "IS", THA: "TH", IDN: "ID", PHL: "PH", VNM: "VN", MYS: "MY", SGP: "SG", PRK: "KP",
  TWN: "TW", HKG: "HK", QAT: "QA", BHR: "BH", UGA: "UG", TZA: "TZ", DZA: "DZ", TUN: "TN", VEN: "VE", PER: "PE",
};

// ---------- Real Act 1 exports ----------
export type Act1Measure = 'per_capita' | 'per_gdp';
export type Act1Season = 'Summer Olympics' | 'Winter Olympics' | 'All Games';
export type Act1Option = 'A (1994+)' | 'B (all time)';
export interface CountryEdition {
  team: string; country_name: string; year: number; season: Exclude<Act1Season, 'All Games'>;
  gold: number; silver: number; bronze: number; total_medals: number; medal_points: number;
  athlete_medal_rows: number; population: number | null; gdp_total_ppp: number | null;
}
export interface ReferenceRanking {
  measure: Act1Measure; option_name: Act1Option; season: Act1Season; team: string; country_name: string;
  games_attended: number; medals: number; points: number; rank_medals: number; rank_points: number;
  medals_ratio: number; points_ratio: number;
}
export const ACT1_FILES = ['act1_country_editions.json', 'act1_reference_rankings.json'] as const;
export type Act1File = typeof ACT1_FILES[number];
export interface Act1Data { editions: CountryEdition[]; reference: ReferenceRanking[] }
export async function loadAct1(): Promise<Act1Data> {
  const [editionsFile, referenceFile] = await Promise.all([
    import('../../public/data/act1_country_editions.json'),
    import('../../public/data/act1_reference_rankings.json'),
  ]);
  const editions = editionsFile.default;
  const reference = referenceFile.default;
  validateAct1File(ACT1_FILES[0], editions);
  validateAct1File(ACT1_FILES[1], reference);
  return { editions: editions as CountryEdition[], reference: reference as ReferenceRanking[] };
}
export const ACT1_LABELS = {
  per_capita: 'Medal score per 1 million inhabitants, per Games (population of each Games year)',
  per_gdp: 'Medal score per 100 bn international $ GDP (PPP, constant 2021), per Games',
};
export function validateAct1File(file: Act1File, input: unknown) {
  if (!Array.isArray(input)) throw new Error('Expected a JSON array.');
  const text = (r: Record<string, unknown>, key: string) => typeof r[key] === 'string';
  const number = (r: Record<string, unknown>, key: string, integer = false) => typeof r[key] === 'number' && Number.isFinite(r[key]) && (!integer || Number.isInteger(r[key]));
  input.forEach((raw, i) => {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error(`Row ${i + 1}: expected an object.`);
    const r = raw as Record<string, unknown>;
    let valid = text(r, 'team') && text(r, 'country_name');
    if (file === ACT1_FILES[0]) {
      valid &&= number(r, 'year', true) && ['Summer Olympics', 'Winter Olympics'].includes(String(r['season']));
      valid &&= ['gold', 'silver', 'bronze', 'total_medals', 'medal_points', 'athlete_medal_rows'].every(k => number(r, k, true));
      valid &&= ['population', 'gdp_total_ppp'].every(k => r[k] === null || number(r, k));
      if (!valid) throw new Error(`Row ${i + 1}: missing field or invalid type.`);
      if (r['total_medals'] !== Number(r['gold']) + Number(r['silver']) + Number(r['bronze'])) throw new Error(`Row ${i + 1}: total_medals must equal gold + silver + bronze.`);
      if (r['medal_points'] !== 3 * Number(r['gold']) + 2 * Number(r['silver']) + Number(r['bronze'])) throw new Error(`Row ${i + 1}: medal_points must equal 3×gold + 2×silver + bronze.`);
    } else {
      valid &&= ['per_capita', 'per_gdp'].includes(String(r['measure'])) && ['A (1994+)', 'B (all time)'].includes(String(r['option_name'])) && ['Summer Olympics', 'Winter Olympics', 'All Games'].includes(String(r['season']));
      valid &&= ['games_attended', 'medals', 'points', 'rank_medals', 'rank_points', 'medals_ratio', 'points_ratio'].every(k => number(r, k));
      if (!valid) throw new Error(`Row ${i + 1}: missing field or invalid type.`);
    }
  });
  return { rows: input.length, medals: file === ACT1_FILES[0] ? (input as CountryEdition[]).reduce((s, r) => s + r.total_medals, 0) : null };
}
export interface Act1Ranking {
  team: string; country_name: string; gold: number; silver: number; bronze: number; medals: number; points: number;
  games_attended: number; denominator: number; points_ratio: number; medals_ratio: number; rank_points: number; rank_medals: number;
}
export function act1Rankings(editions: CountryEdition[], measure: Act1Measure, f: Pick<Filters, 'games' | 'from' | 'to' | 'min'>) {
  const used = editions.filter(r => r.year >= f.from && r.year <= f.to && (f.games === 'All' || r.season === `${f.games} Olympics`));
  const grouped = new Map<string, Act1Ranking>();
  const excluded = new Map<string, { name: string; medals: number }>();
  for (const r of used) {
    const denom = measure === 'per_capita' ? r.population : r.gdp_total_ppp;
    if (denom === null) {
      const e = excluded.get(r.team) ?? { name: r.country_name, medals: 0 }; e.medals += r.total_medals; excluded.set(r.team, e); continue;
    }
    const a = grouped.get(r.team) ?? { team: r.team, country_name: r.country_name, gold: 0, silver: 0, bronze: 0, medals: 0, points: 0, games_attended: 0, denominator: 0, points_ratio: 0, medals_ratio: 0, rank_points: 0, rank_medals: 0 };
    a.gold += r.gold; a.silver += r.silver; a.bronze += r.bronze; a.medals += r.total_medals; a.points += r.medal_points; a.games_attended++; a.denominator += denom; grouped.set(r.team, a);
  }
  const factor = measure === 'per_capita' ? 1e6 : 1e11;
  const eligible = [...grouped.values()].filter(r => r.medals >= f.min && r.denominator > 0);
  eligible.forEach(r => { r.points_ratio = r.points / r.denominator * factor; r.medals_ratio = r.medals / r.denominator * factor; });
  for (const [ratio, rank] of [['points_ratio', 'rank_points'], ['medals_ratio', 'rank_medals']] as const) {
    const sorted = [...eligible].sort((a,b) => b[ratio] - a[ratio]);
    sorted.forEach((r,i) => { const prev = sorted[i-1]; r[rank] = prev && prev[ratio] === r[ratio] ? prev[rank] : i+1; });
  }
  const noSource = [...excluded.entries()].filter(([team, e]) => e.medals > 0 && !grouped.has(team)).map(([,e]) => e).sort((a,b) => a.name.localeCompare(b.name));
  const footnote = noSource.length ? `Not ranked ${measure === 'per_capita' ? 'per capita (no population' : 'per GDP (no GDP'} in source): ${noSource.map(e => `${e.name} (${fmtCount(e.medals)})`).join(', ')}.` : '';
  return { rows: eligible.sort((a,b) => b.points_ratio-a.points_ratio), hidden: grouped.size-eligible.length, footnote };
}
export const fmtAct1Ratio = (n: number) => n < 0.01 ? '< 0.01' : fmtRatio(n);
export function validateAct1Rankings(editions: CountryEdition[], reference: ReferenceRanking[]) {
  const combinations = [];
  for (const measure of ['per_capita', 'per_gdp'] as const) for (const option of ['A (1994+)', 'B (all time)'] as const) for (const season of ['Summer Olympics', 'Winter Olympics', 'All Games'] as const) {
    const refs = reference.filter(r => r.measure === measure && r.option_name === option && r.season === season);
    const app = act1Rankings(editions, measure, { games: season === 'All Games' ? 'All' : season === 'Summer Olympics' ? 'Summer' : 'Winter', from: option === 'A (1994+)' ? 1994 : 1896, to: 2024, min: 10 }).rows;
    const mismatches: string[] = [];
    const refTeams = new Set<string>();
    for (const r of refs) {
      if (refTeams.has(r.team)) mismatches.push(`${r.team}: duplicate reference row`);
      refTeams.add(r.team);
      const a = app.find(x => x.team === r.team);
      if (!a) { mismatches.push(`${r.team}: missing in app`); continue; }
      for (const key of ['games_attended','medals','points','rank_points','rank_medals','points_ratio','medals_ratio'] as const) {
        const differs = key.endsWith('ratio') ? Math.abs(a[key]-r[key]) > 0.005 + Number.EPSILON : a[key] !== r[key];
        if (differs) mismatches.push(`${r.team} · ${key}: reference ${r[key]}, app ${a[key]}`);
      }
    }
    for (const a of app) if (!refTeams.has(a.team)) mismatches.push(`${a.team}: missing in reference`);
    if (!refs.length && !app.length) mismatches.push('No reference rows available.');
    combinations.push({ measure, option, season, referenceRows: refs.length, appRows: app.length, mismatches });
  }
  return combinations;
}
