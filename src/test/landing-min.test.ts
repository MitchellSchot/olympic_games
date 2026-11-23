import { describe, it, expect } from 'vitest';
import act1 from '../../public/data/act1_country_editions.json';
import act2 from '../../public/data/act2_country_editions.json';
import { landingAct1Top, landingAct2Top, validateLandingMin } from '@/lib/landing-cards';
import type { CountryEdition } from '@/lib/data';
import type { Act2Edition } from '@/lib/real-acts';
const e1 = act1 as CountryEdition[], e2 = act2 as Act2Edition[];
describe('landing cards respect Min. medals', () => {
  it('matches the pages for min 10, 50, 100', () => expect(validateLandingMin(e1, e2).every(c => c.pass)).toBe(true));
  it('Act 1 top has at least the minimum medals', () => expect(landingAct1Top(e1, { games: 'All', from: 1896, to: 2024, min: 100 })!.medals).toBeGreaterThanOrEqual(100));
  it('Act 2 top has at least the minimum medals won', () => expect(landingAct2Top(e2, { games: 'All', from: 1896, to: 2024, min: 100 })!.medals_won).toBeGreaterThanOrEqual(100));
  it('shows nothing when no country meets the minimum', () => {
    expect(landingAct1Top(e1, { games: 'All', from: 1896, to: 2024, min: 1e9 })).toBeUndefined();
    expect(landingAct2Top(e2, { games: 'All', from: 1896, to: 2024, min: 1e9 })).toBeUndefined();
  });
});
