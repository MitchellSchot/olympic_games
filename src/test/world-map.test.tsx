import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { WorldMap } from '@/components/world-map';
import { act2MapCoverage, act2Migration, loadRealActs } from '@/lib/real-acts';
import { worldFeatures } from '@/lib/world-map-data';

afterEach(cleanup);
it('capital fallback uses the same medal tooltip and selection as country shapes', async () => {
  const data = await loadRealActs();
  const coverage = act2MapCoverage(act2Migration(data.act2, { games: 'All', from: 1896, to: 2024 }).rows, data.mapping, worldFeatures.filter(f => String(f.id) !== '438'));
  const select = vi.fn();
  render(<WorldMap rows={coverage.drawn} markers={coverage.markers} selected={null} onSelect={select} />);
  const marker = screen.getByLabelText(/Liechtenstein: .* net imported medals/);
  fireEvent.focus(marker);
  expect(screen.getByText('Liechtenstein')).toBeDefined();
  expect(screen.getByText('Share won by foreign-born')).toBeDefined();
  expect(screen.getByText('70.0%')).toBeDefined();
  fireEvent.click(marker);
  expect(select).toHaveBeenCalledWith('LIE');
  fireEvent.keyDown(marker, { key: 'Enter' });
  expect(select).toHaveBeenCalledTimes(2);
});