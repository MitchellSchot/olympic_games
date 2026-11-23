import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, cleanup } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { DataProvider, useData } from '@/lib/app-state';
import { AppDataContext } from '@/lib/app-data-context';
import type { AppData } from '@/lib/data';

vi.mock('@/lib/data', async importOriginal => {
  const actual = await importOriginal<typeof import('@/lib/data')>();
  return { ...actual, loadAll: vi.fn() };
});
afterEach(cleanup);
function Consumer() {
  const data = useData();
  return <span>{data.metadata.generated_at}</span>;
}
it('reads the shared context used by the provider', () => {
  const data = { metadata: { generated_at: 'original-data' } } as AppData;
  render(<AppDataContext.Provider value={data}><Consumer /></AppDataContext.Provider>);
  expect(screen.getByText('original-data')).toBeDefined();
});
it('renders consumers only once the provider has loaded data', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  // Prime the same query used by DataProvider to avoid network access.
  client.setQueryData(['app-data'], { metadata: { generated_at: 'loaded-data' } });
  render(<QueryClientProvider client={client}><DataProvider><Consumer /></DataProvider></QueryClientProvider>);
  expect(await screen.findByText('loaded-data')).toBeDefined();
});