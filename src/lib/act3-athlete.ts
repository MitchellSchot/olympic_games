import { queryOptions } from '@tanstack/react-query';
import editionsSource from '../../public/data/act3_province_editions_athlete.json';
import totalsSource from '../../public/data/act3_province_totals_athlete.json';
import { DataFileError, type Province } from './data';
import type { Selection, ValidationCheck } from './real-acts';

const medalFields = ['gold', 'silver', 'bronze', 'medals'] as const;
export interface AthleteMedals { gold: number; silver: number; bronze: number; medals: number }
export interface AthleteEdition extends AthleteMedals { birth_province: string; year: number; season: string; medal_winners: number }
export interface AthleteTotal extends AthleteMedals { birth_province: string; period: string; medal_winners: number }
export interface AthleteData { editions: AthleteEdition[]; totals: AthleteTotal[] }
export interface AthleteProvince extends AthleteMedals { name: string; nis: string | null; winners: number | null }
export const ATHLETE_WINNERS_NOTE = 'Number of medal winners is only available for the full periods.';
const emptyMedals = (): AthleteMedals => ({ gold: 0, silver: 0, bronze: 0, medals: 0 });

export async function loadAthleteAct3(): Promise<AthleteData> {
  for (const [file, rows, isEdition] of [
    ['act3_province_editions_athlete.json', editionsSource, true],
    ['act3_province_totals_athlete.json', totalsSource, false],
  ] as const) {
    if (!rows.length) throw new DataFileError(file, 'Expected a non-empty array.');
    for (const [i, row] of rows.entries()) {
      const r = row as unknown as Record<string, unknown>;
      const valid = typeof r['birth_province'] === 'string' && [...medalFields, 'medal_winners', ...(isEdition ? ['year'] : [])].every(k => typeof r[k] === 'number' && Number.isInteger(r[k]) && Number(r[k]) >= 0);
      const validPeriod = isEdition ? ['Summer Olympics', 'Winter Olympics'].includes(String(r['season'])) : ['All years', '1994+'].includes(String(r['period']));
      if (!valid || !validPeriod) throw new DataFileError(file, `Row ${i + 1}: missing or invalid whole-number field.`);
    }
  }
  return { editions: editionsSource, totals: totalsSource };
}
export const athleteAct3Query = queryOptions({ queryKey: ['act3-athlete'], queryFn: loadAthleteAct3, staleTime: Infinity });
export function rankAthleteProvinces(rows: AthleteProvince[]) {
  return [...rows].sort((a, b) => b.medals - a.medals || b.gold - a.gold || a.name.localeCompare(b.name, 'en')).map((row, i) => ({ row, rank: i + 1 }));
}
export function athleteProvinces(data: AthleteData, provinces: Province[], f: Selection) {
  const period = f.games === 'All' && f.to === 2024 ? f.from === 1896 ? 'All years' : f.from === 1994 ? '1994+' : null : null;
  const nisByName = new Map(provinces.map(p => [p.nis === '04000' ? 'Brussels' : p.name_en, p.nis]));
  const names = new Set([...nisByName.keys(), ...data.editions.map(r => r.birth_province), 'Unknown']);
  const groups = new Map<string, AthleteProvince>([...names].map(name => [name, { name, nis: nisByName.get(name) ?? null, ...emptyMedals(), winners: period ? data.totals.find(r => r.birth_province === name && r.period === period)?.medal_winners ?? 0 : null }]));
  for (const r of data.editions) {
    if (r.year < f.from || r.year > f.to || (f.games !== 'All' && r.season !== `${f.games} Olympics`)) continue;
    const group = groups.get(r.birth_province);
    if (group) for (const field of medalFields) group[field] += r[field];
  }
  const all = [...groups.values()];
  const summed = emptyMedals();
  for (const r of all) for (const field of medalFields) summed[field] += r[field];
  return { areas: all.filter(r => r.nis !== null), unknown: groups.get('Unknown') ?? { name: 'Unknown', nis: null, ...emptyMedals(), winners: null }, unmatched: all.filter(r => r.nis === null && r.name !== 'Unknown'), total: summed.medals, summed, period };
}
export function validateAthleteAct3(data: AthleteData, provinces: Province[]): ValidationCheck[] {
  const checks: ValidationCheck[] = [];
  const equal = (check: string, expected: number | string, actual: number | string) => checks.push({ check, expected: String(expected), actual: String(actual), pass: expected === actual });
  for (const [file, rows] of [['Editions', data.editions], ['Totals', data.totals]] as const) {
    for (const [i, r] of rows.entries()) equal(`${file} row ${i + 1} · ${r.birth_province} · gold + silver + bronze`, r.medals, r.gold + r.silver + r.bronze);
  }
  for (const [period, from] of [['All years', 1896], ['1994+', 1994]] as const) {
    const p = athleteProvinces(data, provinces, { games: 'All', from, to: 2024 });
    const rows = [...p.areas, p.unknown, ...p.unmatched];
    const names = new Set([...rows.map(r => r.name), ...data.totals.filter(r => r.period === period).map(r => r.birth_province)]);
    for (const name of names) {
      const reference = data.totals.find(r => r.period === period && r.birth_province === name);
      const row = rows.find(r => r.name === name);
      for (const field of medalFields) equal(`${name} · ${period} · ${field}`, reference?.[field] ?? 0, row?.[field] ?? 0);
    }
    const expected = [...p.areas].sort((a, b) => {
      if (a.medals !== b.medals) return b.medals - a.medals;
      if (a.gold !== b.gold) return b.gold - a.gold;
      return a.name.localeCompare(b.name, 'en');
    }).map(r => r.name).join(' → ');
    equal(`Ranking order · ${period}`, expected, rankAthleteProvinces(p.areas).map(r => r.row.name).join(' → '));
    equal(`Sequential ranks · ${period}`, p.areas.map((_, i) => i + 1).join(', '), rankAthleteProvinces(p.areas).map(r => r.rank).join(', '));
  }
  const p = athleteProvinces(data, provinces, { games: 'All', from: 1896, to: 2024 });
  for (const [field, expected] of [['medals', 450], ['gold', 124], ['silver', 172], ['bronze', 154]] as const) equal(`All years · total ${field}`, expected, p.summed[field]);
  const ranks = rankAthleteProvinces(p.areas);
  const antwerp = ranks.find(r => r.row.name === 'Antwerp');
  for (const [field, expected] of [['gold', 24], ['silver', 52], ['bronze', 40], ['medals', 116]] as const) equal(`Antwerp · ${field}`, expected, antwerp?.row[field] ?? 'Missing');
  equal('Antwerp · rank', 1, antwerp?.rank ?? 'Missing');
  const brussels = ranks.find(r => r.row.name === 'Brussels');
  equal('Brussels · total', 108, brussels?.row.medals ?? 'Missing');
  equal('Brussels · rank', 2, brussels?.rank ?? 'Missing');
  equal('Unknown · total', 67, p.unknown.medals);
  const west = ranks.find(r => r.row.name === 'West Flanders');
  const brabant = ranks.find(r => r.row.name === 'Flemish Brabant');
  equal('West Flanders · tiebreak medals / gold', '24 / 11', west ? `${west.row.medals} / ${west.row.gold}` : 'Missing');
  equal('Flemish Brabant · tiebreak medals / gold', '24 / 9', brabant ? `${brabant.row.medals} / ${brabant.row.gold}` : 'Missing');
  equal('Tiebreak · West Flanders above Flemish Brabant', 'West Flanders before Flemish Brabant', west && brabant && west.rank < brabant.rank ? 'West Flanders before Flemish Brabant' : 'Incorrect order');
  return checks;
}export function landingAct3Note(f: Selection) {
  return `${f.games === 'All' ? 'All Games' : `${f.games} Games`}, ${f.from}–${f.to} · every medal counts for each athlete`;
}
/** Landing-page Act 3 card: same aggregation and ranking as the Close to home page; Unknown excluded. */
export function landingAct3Card(data: AthleteData, provinces: Province[], f: Selection) {
  const top = rankAthleteProvinces(athleteProvinces(data, provinces, f).areas)[0]?.row;
  return top && top.medals > 0 ? { name: top.name, medals: top.medals, gold: top.gold, silver: top.silver, bronze: top.bronze, label: `${top.name}: most Olympic medals of all Belgian provinces` } : null;
}
export function validateLandingAct3(data: AthleteData, provinces: Province[]): ValidationCheck[] {
  const fmt = (c: ReturnType<typeof landingAct3Card>) => c ? `${c.name} · ${c.medals} · ${c.gold}/${c.silver}/${c.bronze}` : 'No Belgian medals';
  const modern = { games: 'All', from: 1994, to: 2024 } as const;
  const pageTop = rankAthleteProvinces(athleteProvinces(data, provinces, modern).areas)[0]?.row;
  return [
    ['Landing Act 3 card · All Games 1896–2024', 'Antwerp · 116 · 24/52/40', fmt(landingAct3Card(data, provinces, { games: 'All', from: 1896, to: 2024 }))],
    ['Landing Act 3 card · All Games 1994–2024 matches Close to home top row', pageTop ? `${pageTop.name} · ${pageTop.medals} · ${pageTop.gold}/${pageTop.silver}/${pageTop.bronze}` : 'No Belgian medals', fmt(landingAct3Card(data, provinces, modern))],
  ].map(([check, expected, actual]) => ({ check: check!, expected: expected!, actual: actual!, pass: expected === actual }));
}
