import { CountryName } from '@/lib/flags';
import { useEffect, useMemo, useRef, useState } from "react";
import { geoNaturalEarth1, geoPath } from "d3-geo";
import { scaleDiverging } from "d3-scale";
import { mapFeatureKey, worldFeatures } from "@/lib/world-map-data";
import type { Act2Row, MapShapeRow, MapMarkerRow } from "@/lib/real-acts";
import { fmtMedals, fmtNet, fmtShare } from "@/lib/real-acts";

const W = 960, H = 500;

export function WorldMap({ rows, markers, selected, onSelect }: {
  rows: MapShapeRow[]; markers: MapMarkerRow[]; selected: string | null; onSelect: (noc: string | null) => void;
}) {
  const byFeature = useMemo(() => new Map(rows.map(r => [r.featureKey, r])), [rows]);
  const byNoc = useMemo(() => new Map([...rows, ...markers].map(r => [r.noc_code, r])), [rows, markers]);
  const projection = useMemo(() => geoNaturalEarth1().fitSize([W, H], { type: "Sphere" } as never), []);
  const path = useMemo(() => geoPath(projection), [projection]);
  const max = Math.max(1, ...[...rows, ...markers].map((r) => Math.abs(r.net)));
  const [palette, setPalette] = useState<string[] | null>(null);
  useEffect(() => { const css = getComputedStyle(document.documentElement); setPalette(["--loss", "--neutral", "--gain"].map(k => css.getPropertyValue(k).trim())); }, []);
  const color = palette ? scaleDiverging<string>().domain([-max, 0, max]).range(palette) : null;
  const [hover, setHover] = useState<{ noc: string | null; name: string; x: number; y: number } | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  const handler = (noc: string | null, name: string) => (e: React.MouseEvent | React.FocusEvent) => {
    const container = ref.current;
    if (!container) return;
    const box = container.getBoundingClientRect();
    const target = e.currentTarget.getBoundingClientRect();
    const x = "clientX" in e ? e.clientX : target.x + target.width / 2;
    const y = "clientY" in e ? e.clientY : target.y + target.height / 2;
    setHover({ noc, name, x: x - box.left, y: y - box.top });
  };
  const fill = (row?: Act2Row) => row && Math.abs(row.net) > 1e-9 && color ? color(row.net) : "var(--neutral)";
  const r = hover?.noc ? byNoc.get(hover.noc) : null;

  return (
    <div ref={ref} className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="World map of net medal migration">
        <path d={path({ type: "Sphere" } as never) ?? ""} className="fill-muted/40" />
        {worldFeatures.map((f, index) => {
          const row = byFeature.get(mapFeatureKey(f));
          const noc = row?.noc_code ?? null;
          const name = (f.properties as { name?: string })?.name ?? "Unknown";
          const isSel = noc && noc === selected;
          return (
            <path key={`${mapFeatureKey(f)}:${index}`} d={path(f) ?? ""} data-noc={noc} data-map-kind={row ? "shape" : undefined}
              fill={fill(row)}
              stroke={isSel ? "var(--foreground)" : "var(--card)"} strokeWidth={isSel ? 1.8 : 0.5}
              tabIndex={row ? 0 : -1}
              aria-label={row ? `${row.country_name}: ${fmtNet(row.net)} net imported medals` : name}
              className="cursor-pointer outline-none focus:stroke-foreground"
              onMouseMove={handler(noc, name)} onFocus={handler(noc, name)} onMouseLeave={() => setHover(null)} onBlur={() => setHover(null)}
              onClick={() => noc && onSelect(noc === selected ? null : noc)}
              onKeyDown={(e) => { if (noc && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); onSelect(noc === selected ? null : noc); } }}
            />
          );
        })}
        {markers.map(row => {
          const point = projection([...row.coordinates]);
          if (!point) return null;
          const isSel = row.noc_code === selected;
          return <circle key={row.noc_code} cx={point[0]} cy={point[1]} r={4}
            data-noc={row.noc_code} data-map-kind="marker" fill={fill(row)}
            stroke={isSel ? "var(--foreground)" : "var(--card)"} strokeWidth={isSel ? 1.8 : 0.8}
            tabIndex={0} aria-label={`${row.country_name}: ${fmtNet(row.net)} net imported medals`}
            className="cursor-pointer outline-none focus:stroke-foreground"
            onMouseMove={handler(row.noc_code, row.country_name)} onFocus={handler(row.noc_code, row.country_name)}
            onMouseLeave={() => setHover(null)} onBlur={() => setHover(null)}
            onClick={() => onSelect(isSel ? null : row.noc_code)}
            onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(isSel ? null : row.noc_code); } }} />;
        })}
      </svg>
      {hover && (
        <div className="pointer-events-none absolute z-10 w-60 max-w-full rounded-lg border bg-popover p-3 text-sm shadow-lg"
          style={{ left: Math.max(0, Math.min(hover.x + 14, (ref.current?.clientWidth ?? 600) - 240)), top: hover.y + 14 }}>
          <div className="font-display text-lg font-bold">{r ? <CountryName noc={r.noc_code} name={r.country_name} current={r.code_status === "current"} /> : hover.name}</div>
          {r ? <MigrationLines r={r} /> : <div className="text-muted-foreground">No data / not matched</div>}
        </div>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
        <span className="font-semibold text-loss">Net exporter</span>
        <div className="h-3 w-48 rounded" style={{ background: "var(--migration-scale)" }} />
        <span className="font-semibold text-gain">Net importer</span>
        <span className="ml-4 flex items-center gap-1"><span className="inline-block h-3 w-3 rounded bg-neutral" /> Zero / no data</span>
        <span className="ml-auto text-muted-foreground">±{fmtMedals(max)} medals</span>
      </div>
    </div>
  );
}

export function MigrationLines({ r }: { r: Act2Row }) {
  return (
    <dl className="mt-2 grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1 text-sm">
      {[
        ['Medals won', fmtMedals(r.medals_won)], ['Born here', fmtMedals(r.medals_by_born_here)],
        ['Imported (born elsewhere, won here)', fmtMedals(r.imported_medals)],
        ['Exported (born here, won elsewhere)', fmtMedals(r.exported_medals)],
        ['Net imported', fmtNet(r.net)], ['Share won by foreign-born', fmtShare(r.share)],
      ].map(([label, value]) => <div key={label} className="contents"><dt className="text-muted-foreground">{label}</dt><dd className="text-right font-semibold tabular-nums">{value}</dd></div>)}
    </dl>
  );
}
