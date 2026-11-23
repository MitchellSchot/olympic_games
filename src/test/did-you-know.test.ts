import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import source from '../../public/data/did_you_know.json';
import { factCards, validateDidYouKnow, validateDidYouKnowFile, type DidYouKnow } from '@/lib/did-you-know-data';

const facts = source as DidYouKnow[];
describe('fixed real facts', () => {
  it('preserves the uploaded bytes', () => {
    expect(createHash('sha256').update(readFileSync('public/data/did_you_know.json')).digest('hex')).toBe('9b7a567da192774f327efeddb19bb46f061b8e10113c8b921c98ad3a7e2f3d66');
  });
  it('has exactly four cards in the required order', () => {
    expect(factCards(facts).map(card => card.id)).toEqual(['hall_of_fame', 'small_country_big_haul', 'medal_age', 'antwerp_1920']);
  });
  it('passes the new file schema and rejects sample cards', () => {
    expect(validateDidYouKnowFile(facts)).toBeNull();
    expect(validateDidYouKnowFile([{ id: 'dyk1', title: 'Sample' }])).not.toBeNull();
  });
  it('preserves fact values and bar order without calculation', () => {
    expect(factCards(facts)).toEqual(facts);
    expect(factCards(facts).map(card => card.chart?.data.length ?? 0)).toEqual([0, 4, 6, 29]);
  });
  it('keeps ten world athletes and three Belgian athletes, including tied ranks', () => {
    const lists = factCards(facts)[0]?.lists;
    expect(lists?.map(list => list.rows.length)).toEqual([10, 3]);
    expect(lists?.[0]?.rows.slice(6, 8).map(row => row.rank)).toEqual([7, 7]);
  });
  it('does not expose additional athlete fields', () => {
    const copy = structuredClone(facts);
    const row = copy[0]?.lists?.[0]?.rows[0];
    if (!row) throw new Error('Missing world athlete');
    Object.assign(row, { birthplace: 'Private', birth_date: 'Private' });
    expect(Object.keys(factCards(copy)[0]?.lists?.[0]?.rows[0] ?? {}).sort()).toEqual(['rank', 'name', 'team', 'sport', 'gold', 'silver', 'bronze', 'medals', 'years'].sort());
  });
  it('passes reference checks and detects a changed displayed headline', () => {
    expect(validateDidYouKnow(facts).every(check => check.pass)).toBe(true);
    const displayed = factCards(facts);
    const first = displayed[0];
    if (!first) throw new Error('Missing card');
    first.headline = '27';
    expect(validateDidYouKnow(facts, displayed).find(check => check.check === 'hall_of_fame · headline')?.pass).toBe(false);
  });
  it('detects missing bars and athlete rows', () => {
    const displayed = factCards(facts);
    displayed[1]?.chart?.data.pop();
    displayed[0]?.lists?.[0]?.rows.pop();
    const checks = validateDidYouKnow(facts, displayed);
    expect(checks.find(check => check.check === 'small_country_big_haul · chart bars')?.pass).toBe(false);
    expect(checks.find(check => check.check === 'Hall of fame · World list rows')?.pass).toBe(false);
  });
});