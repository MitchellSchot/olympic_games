import { act1Rankings, type CountryEdition, type Filters } from '@/lib/data';
import { act2Lists, type Act2Edition } from '@/lib/real-acts';

export type RankMedalKind = 'gold' | 'silver' | 'bronze';
const LABEL: Record<RankMedalKind, string> = { gold: '1st place', silver: '2nd place', bronze: '3rd place' };
const OUTLINE: Record<RankMedalKind, string> = { gold: '#8a6d12', silver: '#5f6064', bronze: '#7a4515' };

/** Medal for a displayed rank (shared ranks share the medal). */
export function medalForRank(rank: number): RankMedalKind | null {
  return rank === 1 ? 'gold' : rank === 2 ? 'silver' : rank === 3 ? 'bronze' : null;
}

function MedalShape({ kind, size }: { kind: RankMedalKind; size: number }) {
  const s = OUTLINE[kind];
  return <svg width={size} height={size} viewBox="0 0 18 18" aria-hidden="true">
    <path d="M5 0.5 L8 7 L6.5 8 L3 1.5 Z" fill="var(--ring-blue, #0081c8)" stroke={s} strokeWidth="0.6" />
    <path d="M13 0.5 L10 7 L11.5 8 L15 1.5 Z" fill="var(--ring-red, #ee334e)" stroke={s} strokeWidth="0.6" />
    <circle cx="9" cy="11.5" r="5.5" fill={`var(--${kind})`} stroke={s} strokeWidth="1" />
    <circle cx="9" cy="11.5" r="3.3" fill="none" stroke={s} strokeWidth="0.5" opacity="0.6" />
  </svg>;
}

export function RankMedal({ rank, size = 18 }: { rank: number; size?: number }) {
  const kind = medalForRank(rank);
  if (!kind) return null;
  return <span title={LABEL[kind]} aria-label={LABEL[kind]} data-rank-medal={kind} className="mr-1 inline-flex align-middle"><MedalShape kind={kind} size={size} /></span>;
}

/** SVG-in-SVG version for chart ticks. */
export function RankMedalSvg({ rank, x, y, size = 16 }: { rank: number; x: number; y: number; size?: number }) {
  const kind = medalForRank(rank);
  if (!kind) return null;
  return <g transform={`translate(${x},${y})`} data-rank-medal={kind}><title>{LABEL[kind]}</title><MedalShape kind={kind} size={size} /></g>;
}

export function validateRankMedals(editions: CountryEdition[], act2: Act2Edition[], f: Filters) {
  const lists: [string, number[]][] = [
    ['Rankings · per capita table', act1Rankings(editions, 'per_capita', f).rows.map(r => r.rank_points)],
    ['Rankings · per GDP table', act1Rankings(editions, 'per_gdp', f).rows.map(r => r.rank_points)],
    ['Rankings · top-15 bar chart', act1Rankings(editions, 'per_capita', f).rows.slice(0, 15).map(r => r.rank_points)],
  ];
  const a2 = act2Lists(act2, f);
  lists.push(['Escaping · Top net importers', a2.importers.map(r => r.rank)], ['Escaping · Top net exporters', a2.exporters.map(r => r.rank)], ['Escaping · Highest share foreign-born', a2.shares.map(r => r.rank)]);
  return lists.map(([name, ranks]) => {
    const exp = { gold: ranks.filter(r => r === 1).length, silver: ranks.filter(r => r === 2).length, bronze: ranks.filter(r => r === 3).length };
    const icons = ranks.map(medalForRank);
    const act = { gold: icons.filter(k => k === 'gold').length, silver: icons.filter(k => k === 'silver').length, bronze: icons.filter(k => k === 'bronze').length };
    const ok = icons.every((k, i) => ((ranks[i] ?? 99) <= 3) === (k !== null));
    const e = `${exp.gold}/${exp.silver}/${exp.bronze}`, a = `${act.gold}/${act.silver}/${act.bronze}`;
    return { check: `${name}: rows ranked 1/2/3 have gold/silver/bronze icons`, expected: e, actual: a, pass: ok && e === a };
  });
}
