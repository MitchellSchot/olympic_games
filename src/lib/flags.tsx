import * as Flags from 'country-flag-icons/react/3x2';
import mapping from '../../public/data/noc_to_iso.json';
import { useLayoutEffect, useRef, useState, type ComponentType, type SVGProps } from 'react';

type FlagSvg = ComponentType<SVGProps<SVGSVGElement> & { title?: string }>;
const ALPHA2 = new Map((mapping as { noc_code: string; iso_alpha2?: string }[]).map(m => [m.noc_code, m.iso_alpha2]));

/** Modern flag for a current team's NOC code; historical/neutral/refugee teams have none (never a successor flag). */
export function flagFor(noc: string): FlagSvg | null {
  const a2 = ALPHA2.get(noc);
  return a2 ? ((Flags as unknown as Record<string, FlagSvg>)[a2] ?? null) : null;
}

export function Flag({ noc, current = true, name }: { noc: string; current?: boolean; name?: string }) {
  const Svg = current ? flagFor(noc) : null;
  const cls = 'inline-block h-[14px] w-5 shrink-0 rounded-[2px] border border-border align-[-2px]';
  if (!Svg) return <span className={`${cls} bg-muted`} title={noc} aria-label={`${name ?? noc} (${noc}): no modern flag`} role="img" />;
  return <Svg className={cls} title={name ?? noc} aria-hidden={name ? undefined : true} />;
}

export function CountryName({ noc, name, current = true, code = true }: { noc: string; name: string; current?: boolean | undefined; code?: boolean | undefined }) {
  return <span className="inline-flex items-center gap-2"><Flag noc={noc} current={current} /><span>{name}</span>{code && <span className="text-xs text-muted-foreground">{noc}</span>}</span>;
}

export function validateFlags(currentTeams: string[]) {
  const teams = [...new Set(currentTeams)].sort();
  const missing = teams.filter(t => !flagFor(t));
  return [
    { check: 'Current teams with a flag', expected: String(teams.length), actual: String(teams.length - missing.length), pass: missing.length === 0 },
    { check: 'Current teams without a flag', expected: 'None', actual: missing.length ? missing.join(', ') : 'None', pass: missing.length === 0 },
  ];
}

import * as FlagStrings from 'country-flag-icons/string/3x2';
import { RankMedalSvg } from './rank-medal';

/** Flag SVG as a data URI (same mapping as the tables); null = grey placeholder. */
export function flagDataUri(noc: string, current = true): string | null {
  if (!current) return null;
  const a2 = ALPHA2.get(noc);
  const svg = a2 ? (FlagStrings as unknown as Record<string, string>)[a2] : undefined;
  return svg ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}` : null;
}

let ctx: CanvasRenderingContext2D | null | undefined;
function measureText(t: string) {
  if (typeof document !== 'undefined' && ctx === undefined) { ctx = document.createElement('canvas').getContext('2d'); if (ctx) ctx.font = `12px ${getComputedStyle(document.body).fontFamily}`; }
  return ctx ? ctx.measureText(t).width : t.length * 7;
}

export function truncateLabel(s: string, max = 18) { return s.length > max ? `${s.slice(0, max - 1)}…` : s; }

/** Recharts category-axis tick: [medal] [flag] Name, right-aligned at the axis. */
export function FlagTick({ x, y, label, noc, current = true, rank, max = 18 }: { x: number; y: number; label: string; noc?: string | undefined; current?: boolean | undefined; rank?: number | undefined; max?: number | undefined }) {
  const text = truncateLabel(label, max);
  const ref = useRef<SVGTextElement>(null);
  const [w, setW] = useState(() => measureText(text));
  useLayoutEffect(() => { const n = ref.current?.getComputedTextLength(); if (n) setW(n); }, [text]);
  const fx = x - 4 - w - 20, uri = noc ? flagDataUri(noc, current) : null;
  return <g data-flag-label={label} data-flag-kind={noc ? (uri ? 'flag' : 'placeholder') : 'none'}>
    <title>{label}{noc && !uri ? ` (${noc})` : ''}</title>
    {rank !== undefined && <RankMedalSvg rank={rank} x={fx - 20} y={y - 8} />}
    {uri ? <image href={uri} x={fx} y={y - 5.5} width={16} height={11} preserveAspectRatio="none" /> : null}
    <rect x={fx} y={y - 5.5} width={16} height={11} rx={1.5} fill={uri ? 'none' : 'var(--muted)'} stroke="var(--border)" strokeWidth={0.75} />
    <text ref={ref} x={x - 4} y={y} dy={4} textAnchor="end" fontSize={12} fill="currentColor">{text}</text>
  </g>;
}

/** Chart tooltip: flag + full name + value lines. */
export function FlagTooltip({ active, payload, nocOf, format }: { active?: boolean; payload?: { payload: any; value: unknown; name?: string }[]; nocOf: (row: any) => { noc?: string | undefined; name: string; current?: boolean | undefined }; format: (v: unknown) => string }) {
  if (!active || !payload?.length) return null;
  const p = payload[0]!; const c = nocOf(p.payload);
  return <div className="rounded-md border bg-card px-3 py-2 text-xs shadow-md">
    <div className="mb-1 font-bold">{c.noc ? <CountryName noc={c.noc} name={c.name} current={c.current} /> : c.name}</div>
    <div>{p.name}: <span className="font-bold tabular-nums">{format(p.value)}</span></div>
  </div>;
}

export function validateChartFlags(labels: { chart: string; label: string; noc?: string | undefined; current?: boolean | undefined }[]) {
  const missing = labels.filter(l => !l.noc || (l.current !== false && !flagDataUri(l.noc)));
  return [
    { check: 'Chart country labels with a flag or grey placeholder', expected: String(labels.length), actual: String(labels.length - missing.length), pass: missing.length === 0 },
    { check: 'Chart country labels without a flag', expected: 'None', actual: missing.length ? missing.map(m => `${m.chart}: ${m.label}`).join('; ') : 'None', pass: missing.length === 0 },
  ];
}
