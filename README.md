Born to Win? An interactive demo exploring how much an Olympic medal depends on where you're born: medals per capita and per GDP, athlete migration, and Belgian medal hotspots. Built on open data (1896–2024) prepared in Microsoft Fabric. Vlerick MAI, Modern Data Platforms group assignment.

# Born to Win?

**Does your birthplace decide your medal chances?**

An interactive web demo that looks at 130 years of Olympic medals (1896–2024) through one question: how much of an Olympic medal is decided by where you are born? Built for the Modern Data Platforms group assignment of the Master in AI (MAI) at Vlerick Business School.

## What the demo shows

| Page | Question | Highlights |
|---|---|---|
| **Birth Lottery** | The four key findings at a glance | Live cards for every act, following the filters |
| **1 · Where you're born** | Which countries win the most per inhabitant and per euro of economy? | Medal score per 1M inhabitants and per 100 bn GDP (PPP), Summer/Winter/All, Modern era vs All time |
| **2 · Escaping** | Who gains and who loses Olympic talent through migration? | Net importers and exporters, share won by foreign-born athletes, world map |
| **3 · Close to home** | Which Belgian provinces produce the most medal winners? | Province map with gold, silver and bronze per province |
| **Did you know** | Records and stories from the data | Hall of fame, small countries, age records, Antwerp 1920 |
| **Data & methods** | Where the numbers come from | Sources, lineage, data-quality checks, definitions |

Key finding: over 90% of Olympic medals are won by athletes competing for the country they were born in (or its predecessor/successor state). Only about 1 in 16 medals was won by an athlete who changed country.

## Data

- **Source:** Oonk, G. (2026). *Olympic Athletes & Global Inequality: A Historical Dataset (1896–2024)* (Version V1). DataverseNL, Erasmus University Rotterdam. https://doi.org/10.34894/Q4KJSW
- **Licence:** CC0 1.0 (public domain)
- **Includes:** athlete results and birthplaces (Olympedia), GDP in PPP constant 2021 international $ (Gapminder), population (Gapminder, World Bank fallback)

## Architecture

```
Open Data package (.xlsx, 315,761 rows)
  → Microsoft Fabric Lakehouse: raw (source preserved as text)
  → analysis tables (typed, cleaned, mapped to current countries)
  → export notebooks (JSON)
  → this app (static JSON, no backend)
```

- **Data preparation:** Microsoft Fabric Lakehouse, Spark notebooks and SQL analytics endpoint
- **Usage layer:** React + TypeScript web app built with Lovable
- **Data in the app:** static JSON files exported from Fabric and loaded unchanged in `/public/data/`

## Key definitions

- **Medal score** = 3 × gold + 2 × silver + 1 × bronze
- **Per capita / per GDP:** sum of medal points ÷ sum of population (or GDP) of each Games year, per Games attended. Games without a population or GDP figure are skipped for that measure. Minimum 10 medals.
- **Migration:** born in another country than the one represented, using today's borders. Born in a predecessor or successor state (e.g. Ukraine → Soviet Union) is not counted as migration.
- **Team medals:** counted once (official medal table) on the country pages; counted per athlete on the Belgian province page and in the Hall of fame.

## Validation

The hidden `/validate` page recalculates every ranking with the app's own code and compares it with reference results from Fabric (PASS/FAIL per check). Act 1 rankings were also recalculated independently outside Fabric (712 of 712 rows identical).

## Known limitations

- GDP for closed economies (e.g. Cuba, North Korea) is a modelled estimate.
- Birth countries use today's borders, so historical teams can import talent but never export it.
- About 15% of medals won by Belgian-born athletes cannot be placed in a province.
- Province population is not in the data, so Belgian provinces are compared in absolute numbers.

## Team & use of AI

Group project, Modern Data Platforms, Vlerick Business School (2026). The web app was generated with Lovable; Claude was used for advice, prompts, queries and independent checks. All outputs were checked against Fabric query results.
