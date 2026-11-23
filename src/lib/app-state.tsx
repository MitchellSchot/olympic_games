import { useContext, useCallback, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useSearch, useLocation } from "@tanstack/react-router";
import { loadAll, DataFileError, type AppData, type Filters } from "./data";
import { AlertTriangle } from "lucide-react";
import { AppDataContext } from './app-data-context';

export function DataProvider({ children }: { children: ReactNode }) {
  const q = useQuery({ queryKey: ["app-data"], queryFn: loadAll, staleTime: Infinity, retry: false });
  if (q.isError) {
    const e = q.error;
    const file = e instanceof DataFileError ? e.file : "unknown file";
    return (
      <div className="mx-auto mt-16 max-w-lg rounded-xl border-2 border-destructive/40 bg-card p-8 shadow-sm">
        <div className="flex items-center gap-3 text-destructive">
          <AlertTriangle className="h-6 w-6" />
          <h2 className="text-2xl font-bold">Data file problem</h2>
        </div>
        <p className="mt-4 text-lg">
          <code className="rounded bg-muted px-2 py-0.5 font-mono">/data/{file}</code>
        </p>
        <p className="mt-2 text-muted-foreground">{e.message}</p>
        <p className="mt-4 text-sm text-muted-foreground">Drop a valid export into <code>public/data/</code> and reload.</p>
      </div>
    );
  }
  if (!q.data) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-2 w-48 animate-pulse rounded-full stripe" />
      </div>
    );
  }
  return <AppDataContext.Provider value={q.data}>{children}</AppDataContext.Provider>;
}

export function useData() {
  const d = useContext(AppDataContext);
  if (!d) throw new Error("useData outside DataProvider");
  return d;
}

/** Agreed rule: hide countries with fewer than 10 medals by default on every page. */
export const DEFAULT_MIN_MEDALS = 10;

export interface SearchParams { games?: "All" | "Summer" | "Winter"; from?: number; to?: number; counting?: "team" | "athlete"; min?: number }

export function validateSearch(s: Record<string, unknown>): SearchParams {
  const out: SearchParams = {};
  if (s["games"] === "All" || s["games"] === "Summer" || s["games"] === "Winter") out.games = s["games"];
  if (s["counting"] === "team" || s["counting"] === "athlete") out.counting = s["counting"];
  for (const k of ["from", "to", "min"] as const) {
    const n = Number(s[k]);
    if (s[k] !== undefined && Number.isFinite(n)) out[k] = n;
  }
  return out;
}

export function useFilters(): [Filters, (p: Partial<Filters>) => void] {
  const data = useData();
  const isRankings = useLocation().pathname === "/rankings";
  const s = useSearch({ strict: false }) as SearchParams;
  const navigate = useNavigate();
  const g = data.metadata.games_covered;
  const f: Filters = {
    games: s.games ?? (isRankings ? "Summer" : "All"),
    from: s.from ?? (isRankings ? 1994 : g.from),
    to: s.to ?? (isRankings ? 2024 : g.to),
    counting: s.counting ?? "team",
    min: s.min ?? DEFAULT_MIN_MEDALS,
  };
  const set = useCallback(
    (p: Partial<Filters>) =>
      navigate({ to: ".", search: (prev: SearchParams) => ({ ...prev, ...p }), replace: true, resetScroll: false } as never),
    [navigate],
  );
  return [f, set];
}
