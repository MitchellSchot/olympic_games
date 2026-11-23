import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import provinces from '../../public/data/provinces.json';
import { athleteProvinces, loadAthleteAct3, rankAthleteProvinces, validateAthleteAct3 } from '@/lib/act3-athlete';

const data = await loadAthleteAct3();
const all = { games: 'All', from: 1896, to: 2024 } as const;
const p = athleteProvinces(data, provinces, all);
describe('Unchanged athlete exports', () => {
  for (const [file, hash] of [['editions', '5e7faf8dfeeb3ad74d780c1ead4556a08d3ea472724f2a7e04d6ed2a59e8a059'], ['totals', '84ec26c35425145757e808d0b97892ed088c884f34e9c8cd842d52f4cbbe324e']]) {
    it(`preserves ${file} bytes`, () => expect(createHash('sha256').update(readFileSync(`public/data/act3_province_${file}_athlete.json`)).digest('hex')).toBe(hash));
  }
});
describe('Belgian athlete medal rules', () => {
  it('totals 450 medals: 124 gold, 172 silver and 154 bronze', () => expect(p.summed).toEqual({ medals: 450, gold: 124, silver: 172, bronze: 154 }));
  it('ranks Antwerp first with 24 gold, 52 silver, 40 bronze and 116 total', () => {
    expect(rankAthleteProvinces(p.areas)[0]).toEqual({ rank: 1, row: { name: 'Antwerp', nis: '10000', gold: 24, silver: 52, bronze: 40, medals: 116, winners: 86 } });
  });
  it('ranks Brussels second with 108 medals', () => expect(rankAthleteProvinces(p.areas)[1]).toMatchObject({ rank: 2, row: { name: 'Brussels', medals: 108, nis: '04000' } }));
  it('keeps Unknown’s 67 medals separate from the 11 mapped areas', () => { expect(p.unknown.medals).toBe(67); expect(p.unknown.nis).toBeNull(); expect(p.areas).toHaveLength(11); expect(p.areas.some(r => r.name === 'Unknown')).toBe(false); });
  it('breaks the 24-medal tie by 11 versus 9 gold', () => {
    const ranks = rankAthleteProvinces(p.areas);
    expect(ranks.find(r => r.row.name === 'West Flanders')).toMatchObject({ rank: 5, row: { medals: 24, gold: 11 } });
    expect(ranks.find(r => r.row.name === 'Flemish Brabant')).toMatchObject({ rank: 6, row: { medals: 24, gold: 9 } });
  });
  it('uses alphabetical order for remaining ties and sequential, unshared ranks', () => {
    const source = p.areas[0];
    if (!source) throw new Error('Missing province');
    expect(rankAthleteProvinces([{ ...source, name: 'Zulu', medals: 10, gold: 2 }, { ...source, name: 'Alpha', medals: 10, gold: 2 }]).map(r => [r.row.name, r.rank])).toEqual([['Alpha', 1], ['Zulu', 2]]);
  });
  it('takes distinct winners from totals for exact full periods', () => {
    expect(p.areas.find(r => r.name === 'Antwerp')?.winners).toBe(86);
    expect(athleteProvinces(data, provinces, { ...all, from: 1994 }).areas.find(r => r.name === 'Antwerp')?.winners).toBe(15);
  });
  for (const f of [{ ...all, games: 'Summer' as const }, { ...all, from: 1995 }, { ...all, to: 2023 }]) {
    it(`withholds winner counts for ${f.games} ${f.from}–${f.to}`, () => expect(athleteProvinces(data, provinces, f).areas.every(r => r.winners === null)).toBe(true));
  }
  it('sums medal colours only within selected Games and years', () => {
    const filtered = athleteProvinces(data, provinces, { games: 'Winter', from: 1994, to: 2024 });
    const rows = data.editions.filter(r => r.season === 'Winter Olympics' && r.year >= 1994 && r.year <= 2024);
    expect(filtered.total).toBe(rows.reduce((s, r) => s + r.medals, 0));
    expect(filtered.total).toBeGreaterThan(0);
    for (const field of ['gold', 'silver', 'bronze'] as const) expect(filtered.summed[field]).toBe(rows.reduce((s, r) => s + r[field], 0));
  });
  it('reports incorrect medal sums and reference totals as failures', () => {
    const first = data.editions[0];
    if (!first) throw new Error('Missing edition');
    const checks = validateAthleteAct3({ ...data, editions: [{ ...first, gold: first.gold + 1 }, ...data.editions.slice(1)] }, provinces);
    expect(checks.find(c => c.check === 'All years · total gold')?.pass).toBe(false);
    expect(checks.find(c => c.check.startsWith('Editions row 1'))?.pass).toBe(false);
  });
});
describe('Athlete Act 3 validation', () => {
  for (const check of validateAthleteAct3(data, provinces)) it(check.check, () => expect(check.pass, `${check.expected}; actual ${check.actual}`).toBe(true));
});import { landingAct3Card, validateLandingAct3 } from '@/lib/act3-athlete';
describe('Landing Act 3 card', () => {
  it('shows Antwerp, 116 medals, 24/52/40 for All Games 1896–2024', () => expect(landingAct3Card(data, provinces, all)).toMatchObject({ name: 'Antwerp', medals: 116, gold: 24, silver: 52, bronze: 40, label: 'Antwerp: most Olympic medals of all Belgian provinces' }));
  it('shows nothing when no medals in selection', () => expect(landingAct3Card(data, provinces, { games: 'Winter', from: 1896, to: 1899 })).toBeNull());
  it('passes validation', () => expect(validateLandingAct3(data, provinces).every(c => c.pass)).toBe(true));
});
