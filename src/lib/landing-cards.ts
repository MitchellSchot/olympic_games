import { act1Rankings, type CountryEdition, type Filters } from './data';
import { act2Lists, type Act2Edition } from './real-acts';

type F = Pick<Filters, 'games' | 'from' | 'to' | 'min'>;
/** Landing Act 1 card: first row of the Rankings page (per capita) for the same filters. */
export const landingAct1Top = (editions: CountryEdition[], f: F) => act1Rankings(editions, 'per_capita', f).rows[0];
/** Landing Act 2 card: top net importer of the Escaping page for the same filters. */
export const landingAct2Top = (act2: Act2Edition[], f: F) => act2Lists(act2, f).importers[0]?.row;

export function validateLandingMin(editions: CountryEdition[], act2: Act2Edition[]) {
  const out: { check: string; expected: string; actual: string; pass: boolean }[] = [];
  {
    const f = { games: 'All' as const, from: 1994, to: 2024, min: 10 };
    const page1 = act1Rankings(editions, 'per_capita', f).rows[0];
    const card1 = landingAct1Top(editions, f);
    const e1 = page1 ? `${page1.team} ${page1.points_ratio}` : 'None', a1 = card1 ? `${card1.team} ${card1.points_ratio}` : 'None';
    out.push({ check: 'Act 1 card = Rankings row 1 · All Games, Modern era, min 10', expected: e1, actual: a1, pass: e1 === a1 });
  }
  for (const min of [10, 50, 100]) {
    const f = { games: 'All' as const, from: 1896, to: 2024, min };
    const page1 = act1Rankings(editions, 'per_capita', f).rows[0];
    const card1 = landingAct1Top(editions, f);
    const e1 = page1 ? `${page1.team} ${page1.points_ratio}` : 'None', a1 = card1 ? `${card1.team} ${card1.points_ratio}` : 'None';
    out.push({ check: `Act 1 card = Rankings row 1 · min ${min}`, expected: e1, actual: a1, pass: e1 === a1 && card1?.medals !== undefined && card1.medals >= min });
    const page2 = act2Lists(act2, f).importers[0]?.row;
    const card2 = landingAct2Top(act2, f);
    const e2 = page2 ? `${page2.noc_code} ${page2.net}` : 'None', a2 = card2 ? `${card2.noc_code} ${card2.net}` : 'None';
    out.push({ check: `Act 2 card = top net importer · min ${min}`, expected: e2, actual: a2, pass: e2 === a2 && (card2?.medals_won ?? 0) >= min });
  }
  return out;
}
