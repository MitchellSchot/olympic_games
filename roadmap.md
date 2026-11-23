# Athlete-count Belgium data
- [x] Preserve the two new exports unchanged and switch only Belgium to athlete medal counts.
- [x] Update province ranking, hover statistics, single-hue map and Act 3 validation.
- [x] Test calculations and verify filters, tooltips and desktop/mobile presentation (400 tests; 271 Act 3 validation checks pass).

# Belgium province map
- [x] Add actual borders for ten provinces and Brussels, retaining province hover statistics.
- [x] Apply black–yellow–red medal shading and verify filters and desktop/mobile rendering.

# Real Did you know facts
- [x] Preserve the attached facts unchanged and render fixed cards, charts and athlete lists without filters or sample labels.
- [x] Remove sample-derived closing numbers and add fact display validation (21 checks PASS).
- [x] Run focused tests and verify the page and validation on desktop and mobile (15 tests PASS; no browser errors).

# Static Act 1 exports
- [x] Save attached exports unchanged in public/data and verify byte identity.
- [x] Load Rankings and validation from static exports without a sample fallback.
- [x] Remove upload page and sign-in flow.
- [x] Run calculation tests and verify public Rankings and validation (24 tests; all 12 reference combinations PASS).

# Real Acts 2 and 3
- [x] Preserve three attached exports unchanged and add separate NOC-to-ISO reference (164 official mappings; Kosovo and atlas omissions listed).
- [x] Replace Migration and Belgium pages with shared real-data calculations and global filters.
- [x] Extend validation with supplied Act 2 and Act 3 checks and add calculation tests (102 validation checks PASS; 135 tests PASS).
- [x] Verify filters, maps, validation, mobile layout and unchanged Act 1.

# Act 2 complete map coverage
- [x] Use the 50m atlas and match Kosovo by feature name without editing data files.
- [x] Add capital-marker fallback sharing shape colours, tooltips and selection (all current teams already have shapes at 50m).
- [x] Require shape or marker coverage for every current medal-winning country and test missing coverage.
- [x] Verify Kosovo interactions, both coverage checks, mobile map and unchanged exports.