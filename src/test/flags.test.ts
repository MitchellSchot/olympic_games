import { describe, it, expect } from 'vitest';
import { flagFor, validateFlags } from '@/lib/flags';
import act1 from '../../public/data/act1_country_editions.json';
import act2 from '../../public/data/act2_country_editions.json';
describe('country flags', () => {
  it('maps the agreed alpha-2 codes', () => {
    for (const n of ['LIE', 'NOR', 'SUI', 'GER', 'NED', 'DEN', 'SLO', 'TPE', 'KOS']) expect(flagFor(n)).not.toBeNull();
  });
  it('gives historical, ROC, neutral and refugee teams no flag', () => {
    for (const n of ['URS', 'GDR', 'ROC', 'EOR', 'AIN']) expect(flagFor(n)).toBeNull();
  });
  it('every current team has a flag', () => {
    const teams = [...(act1 as { team: string }[]).map(r => r.team), ...(act2 as { noc_code: string; code_status: string }[]).filter(r => r.code_status === 'current').map(r => r.noc_code)];
    expect(validateFlags(teams)[1]?.actual).toBe('None');
  });
});
