export interface FactAthlete {
  rank: number; name: string; team: string; sport: string;
  gold: number; silver: number; bronze: number; medals: number; years: string;
}
export interface DidYouKnow {
  id: string; kicker: string; headline: string; headline_label: string; text: string;
  chart: { type: 'bar'; unit: string; data: { label: string; value: number }[] } | null;
  lists: { title: string; rows: FactAthlete[] }[] | null;
  scope: string; method: string; note: string;
}
export const FACT_IDS = ['hall_of_fame', 'small_country_big_haul', 'medal_age', 'antwerp_1920'] as const;
export const ATHLETE_FIELDS = ['rank', 'name', 'team', 'sport', 'gold', 'silver', 'bronze', 'medals', 'years'] as const;

// Explicit projection prevents extra athlete fields from reaching either view.
export function factCards(source: DidYouKnow[]) {
  return source.map(card => ({
    ...card,
    chart: card.chart ? { ...card.chart, data: card.chart.data.map(row => ({ label: row.label, value: row.value })) } : null,
    lists: card.lists?.map(list => ({ title: list.title, rows: list.rows.map(row => ({
      rank: row.rank, name: row.name, team: row.team, sport: row.sport,
      gold: row.gold, silver: row.silver, bronze: row.bronze, medals: row.medals, years: row.years,
    })) })) ?? null,
  }));
}

export function validateDidYouKnowFile(input: unknown): string | null {
  if (!Array.isArray(input)) return 'Expected a JSON array.';
  for (const [i, raw] of input.entries()) {
    if (!raw || typeof raw !== 'object') return `Card ${i + 1}: expected an object.`;
    const card = raw as Record<string, unknown>;
    if (!['id', 'kicker', 'headline', 'headline_label', 'text', 'scope', 'method', 'note'].every(key => typeof card[key] === 'string')) return `Card ${i + 1}: missing text field.`;
    if (card['chart'] !== null) {
      const chart = card['chart'] as DidYouKnow['chart'];
      if (!chart || chart.type !== 'bar' || typeof chart.unit !== 'string' || !Array.isArray(chart.data) || !chart.data.every(row => row && typeof row.label === 'string' && typeof row.value === 'number' && Number.isFinite(row.value))) return `Card ${i + 1}: invalid chart.`;
    }
    if (card['lists'] !== null && (!Array.isArray(card['lists']) || !card['lists'].every(list => list && typeof list.title === 'string' && Array.isArray(list.rows) && list.rows.every((row: FactAthlete) => row && ['name', 'team', 'sport', 'years'].every(key => typeof row[key as keyof FactAthlete] === 'string') && ['rank', 'gold', 'silver', 'bronze', 'medals'].every(key => typeof row[key as keyof FactAthlete] === 'number'))))) return `Card ${i + 1}: invalid athlete list.`;
  }
  return null;
}

export function validateDidYouKnow(source: DidYouKnow[], displayed = factCards(source)) {
  const checks: { check: string; expected: string; actual: string; pass: boolean }[] = [];
  const add = (check: string, expected: string | number, actual: string | number) => checks.push({ check, expected: String(expected), actual: String(actual), pass: expected === actual });
  add('Card count', 4, displayed.length);
  add('Card ids and display order', FACT_IDS.join(', '), displayed.map(card => card.id).join(', '));
  for (const card of source) {
    const view = displayed.find(row => row.id === card.id);
    add(`${card.id} · headline`, card.headline, view?.headline ?? 'Missing');
    add(`${card.id} · headline label`, card.headline_label, view?.headline_label ?? 'Missing');
    add(`${card.id} · chart bars`, card.chart?.data.length ?? 0, view?.chart?.data.length ?? 0);
    add(`${card.id} · list rows`, card.lists?.reduce((sum, list) => sum + list.rows.length, 0) ?? 0, view?.lists?.reduce((sum, list) => sum + list.rows.length, 0) ?? 0);
  }
  const hall = displayed.find(card => card.id === 'hall_of_fame');
  add('Hall of fame · World list rows', 10, hall?.lists?.[0]?.rows.length ?? 0);
  add('Hall of fame · Belgium list rows', 3, hall?.lists?.[1]?.rows.length ?? 0);
  const rows = hall?.lists?.flatMap(list => list.rows) ?? [];
  const extra = [...new Set(rows.flatMap(row => Object.keys(row).filter(key => !(ATHLETE_FIELDS as readonly string[]).includes(key))))];
  add('Hall of fame · allowed athlete fields only', 'No extra fields', extra.length ? extra.join(', ') : rows.length ? 'No extra fields' : 'Missing rows');
  return checks;
}
/** Landing legend card: rank-1 row of hall_of_fame's "World top 10" list. */
export function legendAthlete(source: DidYouKnow[]): FactAthlete | null {
  const list = factCards(source).find(c => c.id === 'hall_of_fame')?.lists?.find(l => l.title === 'World top 10');
  return list?.rows.find(r => r.rank === 1) ?? null;
}

export function validateLegendCard(source: DidYouKnow[], shown: FactAthlete | null) {
  const raw = source.find(c => c.id === 'hall_of_fame')?.lists?.find(l => l.title === 'World top 10')?.rows.find(r => r.rank === 1);
  const fmt = (r?: FactAthlete | null) => r ? [r.name, r.medals, `${r.gold}/${r.silver}/${r.bronze}`] : ['Missing', 'Missing', 'Missing'];
  const [e, a] = [fmt(raw), fmt(shown)];
  return ['Legend card · name', 'Legend card · medals', 'Legend card · gold/silver/bronze'].map((check, i) => ({ check, expected: String(e[i]), actual: String(a[i]), pass: String(e[i]) === String(a[i]) && !!raw }));
}
