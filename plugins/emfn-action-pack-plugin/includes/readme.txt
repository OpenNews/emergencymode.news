# EMFN Action Pack Server-Side Category Mapping Notes

## Goal

Given a generated Action Pack URL such as `emergencymode.news/...&actionPack=ap2.sx`, use the `actionPack=` query parameter to recover the original submitted Action Pack answers, map those answers through `assets/data/_tallCategories.csv`, dedupe the resulting Categories, and apply those Categories to the immediately following Newspack Content Loop with the class `.emfn-action-pack` before it renders.

## Current Format

The current `actionPack` value is now a reversible compact payload produced in `assets/js/emfn-action-pack-plugin.js`.

Format summary:

1. Collect the selected semantic values from controls inside `fieldset.hashable` in DOM order.
2. Pack them into a compact bitmask using the CSV token order.
3. Encode that bitmask as one or more base36 segments.
4. Prefix the token with `ap2.`.

That means PHP can decode the request value directly and recover the original ordered form values without relying on Gravity Forms entry lookup or Gravity Forms history.

## Current State Summary

- `assets/js/emfn-action-pack-plugin.js` encodes selected semantic values from `fieldset.hashable` controls and writes the result into `.hashMarker input` before submit.
- The browser now treats `assets/data/_tallCategories.csv` as the source of truth for token order instead of relying on localized PHP arrays.
- `includes/class-emfn-action-pack-plugin.php` decodes `ap2.` payloads, maps tokens to categories via the same CSV, and filters Query Loop blocks whose class includes `emfn-action-pack`.
- Each encoded value already includes its semantic key, with the first dash as the canonical split point.
- `assets/data/_tallCategories.csv` behaves as repeated `entry_id, category` rows and defines both token order and category mapping.

## Implemented Architecture

### 1. Request Resolution Layer

Implemented in the plugin class to detect Action Pack landing-page requests.

Responsibilities:

- Read and sanitize `$_GET['actionPack']`.
- Bail early if the query parameter is absent.
- Read and sanitize `$_GET['mode']` if that value is intended to affect category selection.
- Decode the Action Pack payload into ordered semantic values.
- Cache the resolved data for the current request so downstream hooks do not repeat the same lookup.

Implemented shape:

- `get_action_pack_payload_from_request()`
- `get_action_pack_values_from_request()`
- `get_action_pack_value_map_from_request()`
- `decode_action_pack_payload( $payload )`

### 2. Payload Decode Layer

The plugin helpers decode the versioned payload directly.

Responsibilities:

- Validate the payload prefix and version.
- Decode the compact base36 payload segments into their bitmask representation.
- Validate the decoded entry list shape.
- Return the original ordered values.
- Build an associative map for downstream normalization by splitting each value on the first dash.

Current implementation details:

- Use a versioned prefix such as `ap2.`.
- Decode the compact bitmask from base36.
- Preserve repeated semantic keys as arrays when building the keyed map.
- Memoizes decoded payloads and resolved categories in private properties on the singleton.
- Keeps token order synchronized with the first appearance of each `entry_id` in the CSV row order.

### 3. Submission Normalization Layer

This is the critical bridge between Gravity Forms storage and the tall CSV.

The decoded payload preserves semantic tokens like `mode-before` and `disasterType-flooding`. The tall CSV uses the same token vocabulary.

Current behavior:

- Reads the decoded Action Pack payload.
- Treats decoded values as canonical semantic `entry_id` tokens.
- Splits tokens on the first dash when building the keyed value map.

Example decoded output:

```php
array(
    'mode-preparing',
    'disasterType-flooding',
    'disasterType-wildfires',
    'delivery-web',
)
```

At this point, the payload format is already semantic enough that no separate field-ID normalization layer is required for the current implementation.

### 4. Tall CSV Loading Layer

PHP loads `assets/data/_tallCategories.csv` into memory once per request and maps tokens to Categories.

Responsibilities:

- Read the file from disk.
- Parse the header row.
- Validate required columns: `entry_id`, `category`.
- Build a lookup map of `entry_id => [ category, category, ... ]`.
- Trim whitespace and ignore blank lines.
- Optionally cache the parsed CSV with a transient or static property.

Implemented shape:

- `get_tall_category_map()`
- `load_tall_category_csv()`

Notes:

- Duplicate `entry_id` rows are expected and are used to accumulate multiple Categories per token.
- Blank values are ignored.
- First appearance order of `entry_id` defines the compact bitmask token order.

### 5. Category Resolution Layer

The plugin uses decoded submission tokens to compute the final unique list of Categories.

Responsibilities:

- For each normalized token, collect all matching Categories from the tall CSV map.
- Flatten the category list.
- Normalize case and whitespace.
- Dedupe values.
- Preserve deterministic order.

Implemented shape:

- `resolve_categories_from_tokens( array $tokens )`

Expected output example:

```php
array(
    'Before',
    'Flooding',
    'Wildfires',
)
```

### 6. Newspack Content Loop Injection Layer

The plugin applies the resolved Categories only to the target loop.

Responsibilities:

- Identify the Newspack Content Loop block that should receive the category filter.
- Limit the filter to the loop whose wrapper or class includes `.emfn-action-pack`.
- Convert category names to term IDs or slugs, depending on the hook requirements.
- Inject those terms before the loop query runs.
- Remove or scope the filter carefully so other loops on the page are unaffected.

Implemented details:

1. Detects Query Loop blocks whose class includes `emfn-action-pack`.
2. Resolves category names to WordPress term IDs with `get_term_by()`.
3. Injects those term IDs into `query_loop_block_query_vars` via `category__in`.
4. Leaves all other Query Loop blocks untouched.

## Current Code Paths

- `get_action_pack_payload_from_request()` reads the incoming request payload.
- `decode_action_pack_payload()` routes `ap2.` vs `ap1.` payloads.
- `decode_action_pack_bitmask_payload()` reconstructs token selections from the CSV-backed token order.
- `resolve_categories_from_tokens()` maps tokens to category names from the same CSV.
- `filter_action_pack_query_loop_vars()` limits the `.emfn-action-pack` Query Loop block to those categories.

## Remaining Caveats

- `_tallCategories.csv` remains the shared contract for token order and category mapping, so client and server behavior depends on that file staying in sync with the live Gravity Forms value vocabulary.
- Legacy `ap1.` payloads are still supported for decode, but new submissions are written as `ap2.` payloads.
- The JS submit path is best-effort: if Gravity Forms async utilities are unavailable, payload encoding is skipped rather than guessed via a weaker fallback.

## Near-Term Adjustments

- Keep README examples aligned with the actual debug output and payload format.
- Update `_tallCategories.csv` whenever new `fieldset.hashable` values are introduced in Gravity Forms.

## Deliverable Scope For Future Passes

Future coding passes may still add:

- stronger validation around malformed payloads
- tooling to verify Gravity Forms values stay in sync with `_tallCategories.csv`
- admin-facing diagnostics for missing token/category mappings