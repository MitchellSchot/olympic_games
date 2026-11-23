import { useContext, type ReactNode } from 'react';
import { queryOptions, useSuspenseQuery } from '@tanstack/react-query';
import { loadAct1 } from './data';
import { Act1DataContext } from './act1-data-context';

export const act1Query = queryOptions({ queryKey: ['act1-data'], queryFn: () => loadAct1(), staleTime: Infinity });
export function Act1Provider({ children }: { children: ReactNode }) {
  const { data } = useSuspenseQuery(act1Query);
  return <Act1DataContext.Provider value={data}>{children}</Act1DataContext.Provider>;
}
export function useAct1() {
  const data = useContext(Act1DataContext);
  if (!data) throw new Error('Act 1 provider is missing.');
  return data;
}