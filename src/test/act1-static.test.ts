import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { loadAct1, validateAct1Rankings } from '@/lib/data';

describe('Unchanged static Act 1 exports', () => {
  it('preserves the attached country editions byte-for-byte', () => {
    const bytes = readFileSync('public/data/act1_country_editions.json');
    expect(createHash('sha256').update(bytes).digest('hex')).toBe('ac2fce9e167a8b172d3a8d38024576c84c451bdbb181bca761f3bbe41f839ac5');
  });
  it('preserves the attached reference rankings byte-for-byte', () => {
    const bytes = readFileSync('public/data/act1_reference_rankings.json');
    expect(createHash('sha256').update(bytes).digest('hex')).toBe('3a45f49ad00c35e97c60aca2b8b1b0510ba9ef6bdc9139d903be55893740502a');
  });
  it('loads the actual exports without authentication or storage calls', async () => {
    const data = await loadAct1();
    expect(data.editions).toEqual(JSON.parse(readFileSync('public/data/act1_country_editions.json', 'utf8')));
    expect(data.reference).toEqual(JSON.parse(readFileSync('public/data/act1_reference_rankings.json', 'utf8')));
    expect(validateAct1Rankings(data.editions, data.reference)).toHaveLength(12);
  });
});