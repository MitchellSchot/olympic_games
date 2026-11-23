import world from 'world-atlas/countries-50m.json';
import { feature } from 'topojson-client';

const topology = world as unknown as Parameters<typeof feature>[0];
const collection = feature(topology, (topology as unknown as { objects: { countries: never } }).objects.countries) as unknown as GeoJSON.FeatureCollection;
export const worldFeatures = collection.features;
export const mapFeatureKey = (f: GeoJSON.Feature) => f.id === undefined ? `name:${f.properties?.['name'] ?? ''}` : String(f.id).padStart(3, '0');

// Capital / administrative-centre coordinates, [longitude, latitude].
// Geographic display references only; original Olympic exports remain untouched.
export const capitalCoordinates: Readonly<Record<string, readonly [number, number]>> = {
  BAR: [-59.6167, 13.1], // Bridgetown
  BER: [-64.7833, 32.3], // Hamilton
  BRN: [50.5833, 26.2333], // Manama
  CPV: [-23.5167, 14.9167], // Praia
  DMA: [-61.4, 15.3], // Roseau
  GRN: [-61.75, 12.05], // St George's
  HKG: [114.1667, 22.3], // Hong Kong
  ISV: [-64.9333, 18.35], // Charlotte Amalie
  KOS: [21.1667, 42.6667], // Pristina
  LCA: [-61, 14], // Castries
  LIE: [9.5167, 47.1333], // Vaduz
  MLT: [14.5167, 35.9], // Valletta
  MON: [7.4167, 43.7333], // Monaco
  MRI: [57.5, -20.1667], // Port Louis
  SAM: [-171.7667, -13.8333], // Apia
  SGP: [103.85, 1.2833], // Singapore
  SKN: [-62.7167, 17.3], // Basseterre
  SMR: [12.45, 43.9333], // San Marino
  STP: [6.7333, 0.3333], // São Tomé
  TGA: [-175.2, -21.1333], // Nukuʻalofa
};