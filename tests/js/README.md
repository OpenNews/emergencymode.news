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

Tests the street address field population logic when users select non-street-address locations (ZIP codes, cities) from Google Places autocomplete. Prevents "undefined" appearing in the street field.

**Test Coverage:**
- ✅ Populates street input with selected autocomplete text when no street_address component
- ✅ Falls back to `formattedAddress` if `placePrediction.text.text` unavailable
- ✅ Falls back to `displayName` if both text and formattedAddress unavailable
- ✅ Handles empty/missing fallback values gracefully
- ✅ Does NOT populate when street_address component exists (Gravity Forms handles it)
- ✅ Correctly identifies missing vs present street_address components
- ✅ Real-world scenarios: ZIP-only, city-only, full address selections

**Key Logic Tested:**
```javascript
if (!addr.street_address) {
  const selectedText = 
    placePrediction?.text?.text || 
    place.formattedAddress || 
    place.displayName || "";
  streetInput.value = selectedText;
}
```

**Regression Prevention:**
- Prevents "undefined" text appearing in street field
- Ensures user-selected text is preserved
- Validates address component parsing logic

## Coming Next

### Version-Keyed Cache Testing (Day 3)
Test WordPress transient cache invalidation on version bumps.

## Shared Test Data

- [`../fixtures/payload-test-cases.json`](../fixtures/payload-test-cases.json) — Round-trip test cases shared with PHP tests
- [`../fixtures/test-categories.csv`](../fixtures/test-categories.csv) — Test category data

## Architecture Note

The WordPress plugin file (`plugins/emfn-action-pack-plugin/assets/js/emfn-action-pack-plugin.js`) runs in browser/WordPress context and can't be directly imported for testing. We extract testable logic to `tests/js/lib/` modules that mirror the production implementation, enabling proper unit testing with coverage tracking.
