import { queryOptions } from '@tanstack/react-query';
import type { Filters, Province } from './data';
import { DataFileError } from './data';
import { capitalCoordinates, mapFeatureKey, worldFeatures } from './world-map-data';

export interface Act2Edition {
  noc_code: string; country_name: string; code_status: 'current' | 'historical' | 'neutral' | 'non-country';
  year: number; season: 'Summer Olympics' | 'Winter Olympics';
  medals_won: number; points_won: number; won_by_home_born: number; won_by_predecessor_born: number;
  imported_medals: number; birth_unknown_medals: number; medals_by_born_here: number; exported_medals: number;
}
export interface Act3Edition { birth_province: string; year: number; season: 'Summer Olympics' | 'Winter Olympics'; medals: number; points: number; medal_winners: number }
export interface Act3Total { birth_province: string; period: 'All years' | '1994+'; medals: number; points: number; medal_winners: number }
export interface NocIso { noc_code: string; iso3: string; iso_numeric: string; iso_alpha2?: string }
export interface RealActsData { act2: Act2Edition[]; editions: Act3Edition[]; totals: Act3Total[]; mapping: NocIso[] }
const act2Numbers = ['medals_won', 'points_won', 'won_by_home_born', 'won_by_predecessor_born', 'imported_medals', 'birth_unknown_medals', 'medals_by_born_here', 'exported_medals'] as const;

function validateRows(file: string, input: unknown, texts: Record<string, readonly string[] | null>, numbers: readonly string[]) {
  if (!Array.isArray(input) || !input.length) throw new DataFileError(file, 'Expected a non-empty array.');
  input.forEach((raw, i) => {
    if (!raw || typeof raw !== 'object') throw new DataFileError(file, `Row ${i + 1}: expected an object.`);
    const r = raw as Record<string, unknown>;
    const validText = Object.entries(texts).every(([key, choices]) => typeof r[key] === 'string' && (!choices || choices.includes(String(r[key]))));
    const validNumbers = numbers.every(key => typeof r[key] === 'number' && Number.isFinite(r[key]) && Number(r[key]) >= 0);
    if (!validText || !validNumbers) throw new DataFileError(file, `Row ${i + 1}: missing or invalid field.`);
  });
}
export async function loadRealActs(): Promise<RealActsData> {
  const [a, e, t, m] = await Promise.all([
    import('../../public/data/act2_country_editions.json'), import('../../public/data/act3_province_editions.json'),
    import('../../public/data/act3_province_totals.json'), import('../../public/data/noc_to_iso.json'),
  ]);
  validateRows('act2_country_editions.json', a.default, { noc_code: null, country_name: null, code_status: ['current', 'historical', 'neutral', 'non-country'], season: ['Summer Olympics', 'Winter Olympics'] }, ['year', ...act2Numbers]);
  validateRows('act3_province_editions.json', e.default, { birth_province: null, season: ['Summer Olympics', 'Winter Olympics'] }, ['year', 'medals', 'points', 'medal_winners']);
  validateRows('act3_province_totals.json', t.default, { birth_province: null, period: ['All years', '1994+'] }, ['medals', 'points', 'medal_winners']);
  validateRows('noc_to_iso.json', m.default, { noc_code: null, iso3: null, iso_numeric: null }, []);
  return { act2: a.default as Act2Edition[], editions: e.default as Act3Edition[], totals: t.default as Act3Total[], mapping: m.default };
}
export const realActsQuery = queryOptions({ queryKey: ['real-acts'], queryFn: loadRealActs, staleTime: Infinity });
export type Selection = Pick<Filters, 'games' | 'from' | 'to'>;
const within = (r: { year: number; season: string }, f: Selection) => r.year >= f.from && r.year <= f.to && (f.games === 'All' || r.season === `${f.games} Olympics`);
export interface Act2Row extends Omit<Act2Edition, 'year' | 'season'> { net: number; share: number | null }
export function act2Migration(editions: Act2Edition[], f: Selection) {
  const groups = new Map<string, Act2Row>();
  for (const r of editions.filter(r => within(r, f))) {
    const a = groups.get(r.noc_code) ?? { noc_code: r.noc_code, country_name: r.country_name, code_status: r.code_status, medals_won: 0, points_won: 0, won_by_home_born: 0, won_by_predecessor_born: 0, imported_medals: 0, birth_unknown_medals: 0, medals_by_born_here: 0, exported_medals: 0, net: 0, share: null };
    for (const key of act2Numbers) a[key] += r[key];
    groups.set(r.noc_code, a);
  }
  const rows = [...groups.values()];
  for (const r of rows) { r.net = r.imported_medals - r.exported_medals; r.share = r.medals_won >= 10 ? r.imported_medals / r.medals_won * 100 : null; }
  return { rows, medals: rows.reduce((s,r) => s+r.medals_won,0), imported: rows.reduce((s,r) => s+r.imported_medals,0), exported: rows.reduce((s,r) => s+r.exported_medals,0) };
}
/** Escaping page lists; teams below Min. medals (medals won) are excluded. Share keeps its own fixed >=10 rule. Shared by page, landing card and validation. */
export function act2Lists(editions: Act2Edition[], f: Selection & { min: number }, currentOnly = false) {
  const m = act2Migration(editions, f);
  const eligible = m.rows.filter(r => r.medals_won >= f.min && (!currentOnly || r.code_status === 'current'));
  return {
    m, eligible,
    importers: competitionRank(eligible.filter(r => r.net > 1e-9), r => r.net),
    exporters: competitionRank(eligible.filter(r => r.net < -1e-9), r => r.net, false),
    shares: competitionRank(eligible.filter(r => r.share !== null), r => r.share ?? 0),
  };
}
export function competitionRank<T>(rows: T[], value: (r: T) => number, descending = true) {
  const sorted = [...rows].sort((a,b) => (descending ? -1 : 1) * (value(a)-value(b)));
  let rank = 0;
  return sorted.map((row,i) => { const previous = sorted[i-1]; if (previous === undefined || Math.abs(value(row)-value(previous)) > 1e-9) rank=i+1; return { row, rank }; });
}
export interface MapShapeRow extends Act2Row { featureKey: string }
export interface MapMarkerRow extends Act2Row { coordinates: readonly [number, number] }
export function act2MapCoverage(rows: Act2Row[], mapping: NocIso[], features: GeoJSON.Feature[] = worldFeatures) {
  const byNoc = new Map(mapping.map(m => [m.noc_code, m]));
  const featureKeys = new Set(features.map(mapFeatureKey));
  const kosovo = features.find(f => f.properties?.['name'] === 'Kosovo');
  const drawn: MapShapeRow[] = [], markers: MapMarkerRow[] = [], unmatched: Act2Row[] = [];
  for (const r of rows.filter(r => r.code_status === 'current')) {
    const m = byNoc.get(r.noc_code);
    const key = r.noc_code === 'KOS' && kosovo ? mapFeatureKey(kosovo) : m?.iso_numeric;
    if (key && featureKeys.has(key)) drawn.push({ ...r, featureKey: key });
    else {
      const coordinates = capitalCoordinates[r.noc_code];
      if (coordinates) markers.push({ ...r, coordinates }); else unmatched.push(r);
    }
  }
  return { drawn, markers, unmatched };
}
export interface Act3Row { name: string; nis: string | null; medals: number; points: number; winners: number | null }
export const WINNERS_NOTE = 'Number of medal winners is only available for the full periods.';
export function act3Provinces(editions: Act3Edition[], totals: Act3Total[], provinces: Province[], f: Selection) {
  const period = f.games === 'All' && f.to === 2024 ? f.from === 1896 ? 'All years' : f.from === 1994 ? '1994+' : null : null;
  const nisByName = new Map(provinces.map(p => [p.nis === '04000' ? 'Brussels' : p.name_en, p.nis]));
  const names = new Set([...nisByName.keys(), ...editions.map(r => r.birth_province)]);
  const groups = new Map<string, Act3Row>([...names].map(name => [name, { name, nis: nisByName.get(name) ?? null, medals: 0, points: 0, winners: period ? totals.find(t => t.birth_province === name && t.period === period)?.medal_winners ?? 0 : null }]));
  for (const r of editions.filter(r => within(r,f))) { const a = groups.get(r.birth_province); if (a) { a.medals += r.medals; a.points += r.points; } }
  const all = [...groups.values()];
  return { areas: all.filter(r => r.nis), unknown: groups.get('Unknown') ?? { name:'Unknown',nis:null,medals:0,points:0,winners:null }, unmatched: all.filter(r => !r.nis && r.name !== 'Unknown'), total: all.reduce((s,r) => s+r.medals,0), period };
}
const medalFormat = new Intl.NumberFormat('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
export const fmtMedals = (n: number) => medalFormat.format(Math.abs(n) < 1e-9 ? 0 : n);
export const fmtNet = (n: number) => (n > 1e-9 ? '+' : n < -1e-9 ? '−' : '') + fmtMedals(Math.abs(n));
export const fmtShare = (n: number | null) => n === null ? '–' : `${fmtMedals(n)}%`;
export interface ValidationCheck { check: string; expected: string; actual: string; pass: boolean }
export function validateRealActs(data: RealActsData, provinces: Province[]) {
  const act2: ValidationCheck[] = [], act3: ValidationCheck[] = [];
  const numeric = (out: ValidationCheck[], check: string, expected: number, actual: number, tolerance: number) => out.push({check, expected: `${expected} (± ${tolerance})`, actual: String(Number(actual.toFixed(4))), pass: Math.abs(expected-actual) <= tolerance+1e-9 });
  const all = act2Migration(data.act2,{games:'All',from:1896,to:2024});
  numeric(act2,'Total medals won · All years',21245,all.medals,0.5);
  const refs = [
    { from:1896,label:'All years',importers:[['United States',117.2],['Australia',37.5],['Canada',36.8],['Greece',36.7],['France',35.3]],exporters:[['Russia',-96.1],['Poland',-47.6],['Ukraine',-30.2],['Ireland',-29.9],['Georgia',-24.1]] },
    { from:1994,label:'1994+',importers:[['Australia',30.5],['Russian Olympic Committee',25.7],['Azerbaijan',23.8],['Greece',21.6],['Canada',16.4]],exporters:[['Russia',-47],['Georgia',-24.1],['Cuba',-18.8],['Uzbekistan',-15],['Armenia',-14.4]] },
  ];
  for (const ref of refs) {
    const m = act2Migration(data.act2,{games:'All',from:ref.from,to:2024});
    act2.push({check:`Imported = Exported · ${ref.label}`,expected:'Difference ≤ 0.5',actual:`${fmtMedals(m.imported)} / ${fmtMedals(m.exported)} (difference ${Math.abs(m.imported-m.exported).toFixed(4)})`,pass:Math.abs(m.imported-m.exported)<=0.5+1e-9});
    for (const [kind,expected] of [['importers',ref.importers],['exporters',ref.exporters]] as const) {
      const ranked = competitionRank(m.rows.filter(r => kind==='importers' ? r.net>0 : r.net<0),r=>r.net,kind==='importers');
      expected.forEach(([name,value],i) => { const r=ranked[i]?.row; const matchesName = r && (r.country_name===name || (name==='Russian Olympic Committee' && r.noc_code==='ROC')); act2.push({check:`#${i+1} net ${kind} · ${ref.label}`,expected:`${name} ${fmtNet(Number(value))}`,actual:r?`${r.country_name} ${fmtNet(r.net)}`:'Missing',pass:Boolean(r && matchesName && Math.abs(r.net-Number(value))<=0.05+1e-9)}); });
    }
    const coverage=act2MapCoverage(m.rows,data.mapping);
    const current = m.rows.filter(r=>r.code_status==='current' && r.medals_won>0);
    const shapes = coverage.drawn.filter(r=>r.medals_won>0), markers = coverage.markers.filter(r=>r.medals_won>0);
    const missing = coverage.unmatched.filter(r=>r.medals_won>0);
    act2.push({check:`Map coverage · ${ref.label}`,expected:'Every current country with medals drawn as a shape or capital marker',actual:`${shapes.length} shapes + ${markers.length} markers / ${current.length} current countries with medals; missing: ${missing.map(r=>`${r.noc_code} · ${r.country_name} (${fmtNet(r.net)})`).join(', ') || 'none'}`,pass:missing.length===0 && shapes.length+markers.length===current.length});
  }
  const share=competitionRank(all.rows.filter(r=>r.share!==null),r=>r.share??0);
  [['Liechtenstein',70],['Azerbaijan',55.4],['Puerto Rico',41.7],['Moldova',35],['Ireland',33.3]].forEach(([name,value],i)=>{const r=share[i]?.row;act2.push({check:`#${i+1} foreign-born share · All years`,expected:`${name} ${value}%`,actual:r?`${r.country_name} ${fmtShare(r.share)}`:'Missing',pass:Boolean(r && r.country_name===name && r.share!==null && Math.abs(r.share-Number(value))<=0.05+1e-9)});});
  const bel=all.rows.find(r=>r.noc_code==='BEL');
  for(const [key,expected] of [['medals_won',176],['imported_medals',8.3],['exported_medals',18.2],['net',-9.9]] as const) numeric(act2,`Belgium · ${key}`,expected,bel?.[key]??NaN,0.05);
  for(const [from,period,total,top] of [[1896,'All years',174.7,[['Antwerp',44.3],['Brussels',29.1],['East Flanders',21.7]]],[1994,'1994+',53,[['East Flanders',11.5],['Brussels',8.5],['Antwerp',8.4]]]] as const){
    const p=act3Provinces(data.editions,data.totals,provinces,{games:'All',from,to:2024});
    numeric(act3,`Total Belgian-born medals · ${period}`,total,p.total,0.1);
    const ranked=competitionRank(p.areas,r=>r.medals);
    top.forEach(([name,value],i)=>{const r=ranked[i]?.row;act3.push({check:`#${i+1} province · ${period}`,expected:`${name} ${fmtMedals(value)}`,actual:r?`${r.name} ${fmtMedals(r.medals)}`:'Missing',pass:r?.name===name&&Math.abs(r.medals-value)<=0.05+1e-9});});
    const names=new Set([...data.editions.map(r=>r.birth_province),...data.totals.filter(r=>r.period===period).map(r=>r.birth_province)]);
    for(const name of names){const t=data.totals.find(r=>r.period===period&&r.birth_province===name);const rows=data.editions.filter(r=>r.birth_province===name&&r.year>=from&&r.year<=2024);
      for(const key of ['medals','points'] as const){const sum=rows.reduce((s,r)=>s+r[key],0);numeric(act3,`${name} · ${period} · ${key}`,t?.[key]??0,sum,0.05);}
    }
  }
  return {act2,act3};
}