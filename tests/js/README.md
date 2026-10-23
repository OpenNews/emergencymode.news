# JavaScript Tests

Jest-based unit tests for client-side Action Pack plugin logic.

## Running Tests

```bash
npm run test:js          # Run all JS tests
npm run test:js:watch    # Run in watch mode
npm run test:js:coverage # Generate coverage report
```

## Test Modules

### Core Logic (`lib/`)
Extracted, testable implementations of plugin logic:
- **[`lib/payload-encoding.js`](lib/payload-encoding.js)** — Core encoding functions (100% coverage)
- **[`lib/risk-rendering.js`](lib/risk-rendering.js)** — Risk display and location data population (100% coverage)
- **[`lib/geolocation.js`](lib/geolocation.js)** — Street address field population from Google Places autocomplete (100% coverage)

These modules mirror the production code from the WordPress plugin but are structured for proper unit testing and coverage tracking.

## Test Suites

### Action Pack Payload Encoding
**File:** [`action-pack/payload-encoding.test.js`](action-pack/payload-encoding.test.js)

Tests the core logic that encodes quiz responses into compact shareable URLs:
- Category ID ordering and bit position mapping
- Bitmask generation (31-bit segments)
- Base36 encoding for URL-safe format
- Multi-segment handling for >31 categories
- Edge cases and invalid input handling

**Key Functions Tested:**
- `packActionPackBits(catIds, categoryOrder)` — Core encoding logic
- `segmentsToPayload(segments, prefix)` — Base36 conversion

**Test Coverage:**
- ✅ Single category encoding
- ✅ Multiple category encoding
- ✅ Input order independence (sorted by position)
- ✅ Multi-segment payloads
- ✅ Empty/null/undefined inputs
- ✅ Unknown category filtering
- ✅ Duplicate category handling

**Coverage Report:**
```
File                 | % Stmts | % Branch | % Funcs | % Lines
---------------------|---------|----------|---------|--------
payload-encoding.js  |     100 |      100 |     100 |     100
```

### Risk Rendering and Location Data
**File:** [`action-pack/risk-rendering.test.js`](action-pack/risk-rendering.test.js)

Tests that risk display correctly populates county and state fields with real location data (regression prevention for bug where template defaults were shown instead of actual values):

**Key Functions Tested:**
- `createRiskElements(risks, template)` — DOM element creation
- `populateLocationFields(riskItem, riskRegion, locData)` — Location field population
- `renderFallbackRisk(...)` — Fallback rendering when data unavailable
- `clearRenderedRisks(risks)` — Clearing previous renders
- `renderRiskList(riskType, hazards)` — Hazard list rendering

**Test Coverage:**
- ✅ County field population from `locData.county`
- ✅ State field population from `locData.state`
- ✅ Template defaults NOT shown when real data available
- ✅ Null/missing location data handling
- ✅ Null DOM element handling (defensive programming)
- ✅ Fallback rendering with partial data
- ✅ Risk clearing while preserving template
- ✅ Multiple render consistency

**Coverage Report:**
```
File                 | % Stmts | % Branch | % Funcs | % Lines
---------------------|---------|----------|---------|--------
risk-rendering.js    |     100 |      100 |     100 |     100
```

### Geolocation and Street Address Population
**File:** [`action-pack/geolocation.test.js`](action-pack/geolocation.test.js)

Tests the street address field population logic when users select non-street-address locations (ZIP codes, cities) from Google Places autocomplete. Tests the extracted `populateStreetAddressField()` function from `lib/geolocation.js`.

**Test Coverage:**
- ✅ Populates street input with selected autocomplete text when no street_address component
- ✅ Falls back to `formattedAddress` if `placePrediction.text.text` unavailable
- ✅ Falls back to `displayName` if both text and formattedAddress unavailable
- ✅ Handles empty/missing fallback values gracefully
- ✅ Does NOT populate when street_address component exists (Gravity Forms handles it)
- ✅ Uses autocomplete attribute selector as primary strategy
- ✅ Falls back to label-based selector when autocomplete attribute missing
- ✅ Returns false when no street input found
- ✅ Address component parsing validation
- ✅ Real-world scenarios: ZIP-only, city-only, full address selections

**Key Function Tested:**
```javascript
populateStreetAddressField(formRoot, addr, placePrediction, place)
// Returns: boolean (true if populated, false if skipped)
```

**Coverage Report:**
```
File               | % Stmts | % Branch | % Funcs | % Lines
-------------------|---------|----------|---------|--------
geolocation.js     |     100 |     87.5 |     100 |     100
```

**Regression Prevention:**
- Prevents "undefined" text appearing in street field
- Ensures user-selected text is preserved
- Validates robust selector fallback strategies
- Tests actual extracted logic instead of duplicating implementation

### Site Styles Script
**File:** [`site-styles/site-styles.test.js`](site-styles/site-styles.test.js)

Unlike the Action Pack tests, this loads the production `emfn-site-styles-plugin.js` and `emfn-site-styles-plugin.css` directly into jsdom (no `lib/` copy), so it is not part of coverage tracking.

**Test Coverage:**
- ✅ `emfn-reduced-motion` body class set from `prefers-reduced-motion`, including when `.lite-site-cta` is absent
- ✅ Class follows live OS setting changes; no-op without `matchMedia`
- ✅ `emfn-save-data` body class set by JS only, from `navigator.connection.saveData` (not server-side: Batcache ignores `Vary`); stale class removed when `saveData` is off
- ✅ `emfn-low-battery` body class at battery ≤ 20% when not charging: checked on load, changes debounced (5s), then pinned after the first minute
- ✅ Rejected/missing Battery API fails silently
- ✅ Lite-site banner visibility is CSS-only: every `.lite-site-cta` on the page shows for each body class and hides again when the signal clears

### Homepage Hero Word Rotation
**File:** [`site-styles/homepage-animation.test.js`](site-styles/homepage-animation.test.js)

Loads the `homepage_animation.html` template backup (live copy is pasted into a WordPress HTML block) and runs its script under fake timers.

**Test Coverage:**
- ✅ Shows each word once, in order, then settles back on the first word and stops (no timers left)
- ✅ No animation at all with reduced motion, reduced data, `navigator.connection.saveData`, or low battery (≤ 20%, not charging)
- ✅ Still animates at low battery while charging, or when `getBattery` rejects
- ✅ Screen readers get one stable heading ("…and after an emergency"): rotating words are `aria-hidden`, a visually hidden copy of the first word carries the meaning

## Coming Next

### Version-Keyed Cache Testing (Day 3)
Test WordPress transient cache invalidation on version bumps.

## Shared Test Data

- [`../fixtures/payload-test-cases.json`](../fixtures/payload-test-cases.json) — Round-trip test cases shared with PHP tests
- [`../fixtures/test-categories.csv`](../fixtures/test-categories.csv) — Test category data

## Architecture Note

The WordPress plugin file (`plugins/emfn-action-pack-plugin/assets/js/emfn-action-pack-plugin.js`) runs in browser/WordPress context and can't be directly imported for testing. We extract testable logic to `tests/js/lib/` modules that mirror the production implementation, enabling proper unit testing with coverage tracking.
