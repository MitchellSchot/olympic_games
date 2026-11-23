import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import provinces from '../../public/data/provinces.json';

it('covers exactly Belgium’s ten provinces and Brussels with matching NIS identifiers', () => {
  const geo = JSON.parse(readFileSync('public/data/geo/belgium_provinces.geojson', 'utf8'));
  const ids = geo.features.map((f: { properties: { nis: string } }) => f.properties.nis);
  expect(ids).toHaveLength(11);
  expect([...ids].sort()).toEqual(provinces.map(p => p.nis).sort());
  expect(ids.filter((id: string) => id === '04000')).toHaveLength(1);
});