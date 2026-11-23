import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { Act1Provider, useAct1 } from '@/lib/act1-state';
import { Act1DataContext } from '@/lib/act1-data-context';
import type { Act1Data } from '@/lib/data';

afterEach(cleanup);
const data: Act1Data = { editions: [], reference: [] };
function Consumer() {
  const exports = useAct1();
  return <span>{exports.editions.length} editions</span>;
}
it('reads the stable Act 1 context outside the refreshable provider module', () => {
  render(<Act1DataContext.Provider value={data}><Consumer /></Act1DataContext.Provider>);
  expect(screen.getByText('0 editions')).toBeDefined();
});
it('provides loaded exports to mounted consumers', () => {
  const client = new QueryClient();
  client.setQueryData(['act1-data'], data);
  render(<QueryClientProvider client={client}><Act1Provider><Consumer /></Act1Provider></QueryClientProvider>);
  expect(screen.getByText('0 editions')).toBeDefined();
});