# Welcome to your Lovable project

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Open your project in the [Lovable editor](https://lovable.dev) and keep building.

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: connect the project to GitHub and every change made in Lovable is committed straight to your repository.
- **Full ownership**: this code is yours. Push to your repository and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Built with

- TanStack Start
- TypeScript
- React
- Tailwind CSS

## Data files (Born to Win?)

Drop new Microsoft Fabric exports into `public/data/` (same file names) — no code changes needed. All loading, validation and aggregation lives in `src/lib/data.ts`.

| File | Schema |
|---|---|
| `metadata.json` | `{ is_sample, generated_at, games_covered:{from,to}, population_year, gdp_year, gdp_unit, sources[], lineage[], quality_checks[], known_limitations[], ai_disclosure }` |
| `countries.json` | `[{ iso3, iso_numeric ("056"), name, population, gdp_usd }]` — iso_numeric joins to the world map |
| `medal_facts.json` | `[{ year, season ("Summer"/"Winter"), represented_iso3, birth_iso3 \| null, medal ("gold"/"silver"/"bronze"), athlete_medals, team_medals }]` |
| `belgium_facts.json` | `[{ year, season, province_nis \| "unknown", represented_iso3, medal, athlete_medals, team_medals }]` |
| `provinces.json` | `[{ nis, name_en, name_nl, name_fr, region, population }]` — 10 provinces + Brussels (04000) |
| `did_you_know.json` | `[{ id, title, statement, highlight_value, highlight_unit, chart?:{type:"bar",data:[{label,value}]}, caveat, how_calculated }]` |
| `geo/belgium_provinces.geojson` | FeatureCollection, each feature has `properties.nis`. Optional — a tile cartogram is shown if missing. |
