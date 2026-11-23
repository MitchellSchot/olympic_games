import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { act2Migration, act2MapCoverage, act3Provinces, competitionRank, loadRealActs, validateRealActs, type Act2Edition } from '@/lib/real-acts';
import provinces from '../../public/data/provinces.json';
import { worldFeatures } from '@/lib/world-map-data';

const data = await loadRealActs();
const all = { games: 'All', from: 1896, to: 2024 } as const;
describe('Original real exports',()=>{
  for(const [file,hash] of [['act2_country_editions.json','628850aa379dd7c4cdea1edb12e2feff99a792f8e25f7d58d32b10bb9544deb8'],['act3_province_editions.json','b9239c5a541179f45a6d19b5a912bd88e23e5e005222d8b2be5bae14de2ef553'],['act3_province_totals.json','e11a02aca373507b6afd93a06fe7e13fd23693ed8c1c3a806be35d093ea8663d']]){
    it(`preserves ${file} byte-for-byte`,()=>expect(createHash('sha256').update(readFileSync(`public/data/${file}`)).digest('hex')).toBe(hash));
  }
});
describe('Act 2 official medal credits',()=>{
  it('has 21,245 medals won across All Games and all years',()=>expect(act2Migration(data.act2,all).medals).toBe(21245));
  for(const from of [1896,1994])it(`balances imports and exports within 0.5 from ${from}`,()=>{const m=act2Migration(data.act2,{...all,from});expect(Math.abs(m.imported-m.exported)).toBeLessThanOrEqual(0.5);});
  it('sums raw credits before calculating net and share, excluding predecessor and unknown births from imports',()=>{
    const r:Act2Edition={noc_code:'TST',country_name:'Test',code_status:'current',year:2000,season:'Summer Olympics',medals_won:5,points_won:8,won_by_home_born:2,won_by_predecessor_born:1,imported_medals:0.14,birth_unknown_medals:1.86,medals_by_born_here:2,exported_medals:0.06};
    const result=act2Migration([r,{...r,year:2004}],all).rows[0];
    expect(result?.imported_medals).toBeCloseTo(0.28,10);expect(result?.net).toBeCloseTo(0.16,10);expect(result?.share).toBeCloseTo(2.8,10);
  });
  it('requires at least 10 medals for share',()=>{const r=data.act2.find(r=>r.noc_code==='LIE');if(!r)throw new Error('Missing Liechtenstein');expect(act2Migration([{...r,medals_won:9.99}],all).rows[0]?.share).toBeNull();expect(act2Migration([{...r,medals_won:10,imported_medals:7}],all).rows[0]?.share).toBe(70);});
  it('uses competition ranks for ties and does not round before ranking',()=>expect(competitionRank([10,10,9.999,8],n=>n).map(r=>r.rank)).toEqual([1,1,3,4]));
  it('maps GER, NED, SUI and TPE with the correct ISO identifiers',()=>{for(const [noc,iso,num,a2] of [['GER','DEU','276','DE'],['NED','NLD','528','NL'],['SUI','CHE','756','CH'],['TPE','TWN','158','TW']])expect(data.mapping.find(r=>r.noc_code===noc)).toEqual({noc_code:noc,iso3:iso,iso_numeric:num,iso_alpha2:a2});});
  it('never draws historical or neutral teams',()=>{const c=act2MapCoverage(act2Migration(data.act2,all).rows,data.mapping);expect([...c.drawn,...c.markers].every(r=>r.code_status==='current')).toBe(true);expect(c.drawn.some(r=>r.noc_code==='URS')).toBe(false);});
  it('matches Kosovo by name without an ISO numeric code',()=>{const c=act2MapCoverage(act2Migration(data.act2,all).rows,data.mapping);expect(data.mapping.find(r=>r.noc_code==='KOS')?.iso_numeric).toBe('');expect(c.drawn.find(r=>r.noc_code==='KOS')?.featureKey).toBe('name:Kosovo');});
  it('covers all 165 current teams with the 50m atlas',()=>{const c=act2MapCoverage(act2Migration(data.act2,all).rows,data.mapping);expect(c.drawn).toHaveLength(165);expect(c.unmatched).toHaveLength(0);expect(c.markers).toHaveLength(0);});
  it('falls back to a capital marker when a current shape is absent',()=>{const c=act2MapCoverage(act2Migration(data.act2,all).rows,data.mapping,worldFeatures.filter(f=>String(f.id)!=='438'));const lie=c.markers.find(r=>r.noc_code==='LIE');expect(lie?.coordinates).toEqual([9.5167,47.1333]);expect(lie?.net).toBe(act2Migration(data.act2,all).rows.find(r=>r.noc_code==='LIE')?.net);expect(c.unmatched).toHaveLength(0);});
  it('fails validation and lists a medal-winning country lacking both shape and capital',()=>{const altered={...data,act2:data.act2.map(r=>r.noc_code==='BEL'?{...r,noc_code:'MISSING'}:r)};const checks=validateRealActs(altered,provinces).act2.filter(c=>c.check.startsWith('Map coverage'));expect(checks).toHaveLength(2);for(const c of checks){expect(c.pass).toBe(false);expect(c.actual).toContain('MISSING · Belgium');}});
  it('does not fail coverage for an undrawn current country with no medals',()=>{const source=data.act2[0];if(!source)throw new Error('No editions');const checks=validateRealActs({...data,act2:[...data.act2,{...source,noc_code:'NO_MEDALS',country_name:'No medals',code_status:'current',medals_won:0}]},provinces).act2.filter(c=>c.check.startsWith('Map coverage'));expect(checks.every(c=>c.pass)).toBe(true);});
  it('applies Games and years to edition rows',()=>{const f={games:'Winter',from:1994,to:2024} as const;const expected=data.act2.filter(r=>r.season==='Winter Olympics'&&r.year>=1994&&r.year<=2024).reduce((s,r)=>s+r.medals_won,0);expect(act2Migration(data.act2,f).medals).toBeCloseTo(expected,8);expect(expected).toBeGreaterThan(0);});
});
describe('Act 3 periods and Belgian provinces',()=>{
  for(const [from,expected] of [[1896,174.7],[1994,53]])it(`totals Belgian-born medals from ${from}`,()=>{if(from===undefined||expected===undefined)throw new Error('Missing test values');expect(Math.abs(act3Provinces(data.editions,data.totals,provinces,{...all,from}).total-expected)).toBeLessThanOrEqual(0.1);});
  it('uses distinct winner totals for the two exact full periods',()=>{expect(act3Provinces(data.editions,data.totals,provinces,all).areas.find(r=>r.name==='Antwerp')?.winners).toBe(86);expect(act3Provinces(data.editions,data.totals,provinces,{...all,from:1994}).areas.find(r=>r.name==='Antwerp')?.winners).toBe(15);});
  for(const f of [{...all,games:'Summer' as const},{...all,from:1995},{...all,to:2023}])it(`does not sum winners for ${f.games} ${f.from}–${f.to}`,()=>expect(act3Provinces(data.editions,data.totals,provinces,f).areas.every(r=>r.winners===null)).toBe(true));
  it('maps 11 areas including Brussels and keeps Unknown separate',()=>{const p=act3Provinces(data.editions,data.totals,provinces,all);expect(p.areas).toHaveLength(11);expect(p.areas.find(r=>r.name==='Brussels')?.nis).toBe('04000');expect(p.unknown.nis).toBeNull();expect(p.unknown.medals).toBeCloseTo(19.62,2);expect(p.unmatched).toHaveLength(0);});
});
describe('Supplied reference checks',()=>{
  const checks=validateRealActs(data,provinces);
  for(const c of [...checks.act2,...checks.act3])it(c.check,()=>expect(c.pass,`${c.expected}; app: ${c.actual}`).toBe(true));
});