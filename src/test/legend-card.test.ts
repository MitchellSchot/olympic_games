import { describe, it, expect } from 'vitest';
import facts from '../../public/data/did_you_know.json';
import { legendAthlete, validateLegendCard, type DidYouKnow } from '@/lib/did-you-know-data';
import { DEFAULT_MIN_MEDALS } from '@/lib/app-state';
describe('landing legend card', () => {
  it('shows the rank-1 World top 10 athlete', () => {
    const a = legendAthlete(facts as DidYouKnow[]);
    expect([a?.name, a?.team, a?.sport, a?.medals, a?.gold, a?.silver, a?.bronze, a?.years]).toEqual(['Michael Phelps', 'United States', 'Swimming', 28, 23, 3, 2, '2004–2016']);
    expect(validateLegendCard(facts as DidYouKnow[], a).every(c => c.pass)).toBe(true);
  });
  it('defaults Min. medals to 10', () => expect(DEFAULT_MIN_MEDALS).toBe(10));
});
