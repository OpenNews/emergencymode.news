# PHP Tests

PHPUnit-based unit tests for WordPress plugin backend logic.

## Running Tests

```bash
npm run test:php              # Run all PHP tests
npm run test:php:coverage     # Generate coverage report (requires xdebug)
vendor/bin/phpunit --testdox  # Human-readable test output
```

## Test Suites

### Action Pack Payload Decoding
**File:** [`action-pack/PayloadDecodingTest.php`](action-pack/PayloadDecodingTest.php)

Tests the server-side logic that decodes shareable URLs back into category IDs:
- Base36 → integer conversion
- Bitmask → category ID mapping
- Round-trip compatibility with JavaScript encoding
- Invalid input rejection and security

**Key Functions Tested:**
- `Payload_Decoder::decode($payload)` — Core decoding logic

**Test Coverage:**
- ✅ Single/multiple category decoding
- ✅ Multi-segment payload handling
- ✅ Round-trip verification (JS → PHP consistency)
- ✅ Invalid character rejection
- ✅ Empty/malformed payload handling
- ✅ Category order preservation
- ✅ Whitespace trimming

## Test Infrastructure

**WordPress Stubs:** Uses [php-stubs/wordpress-stubs](https://github.com/php-stubs/wordpress-stubs) v6.7
- Installed via Composer in `vendor/php-stubs/wordpress-stubs/`
- Provides type definitions for WordPress core functions/classes
- No actual WordPress installation needed for unit tests
- Configured in `.vscode/settings.json` for Intelephense autocomplete

**Bootstrap:** [`bootstrap.php`](bootstrap.php)  
Provides WordPress function stubs for testing without a full WP install:
- Transient API (`get_transient`, `set_transient`, `delete_transient`)
- Escaping functions (`esc_html`, `esc_attr`, `wp_kses_post`)
- Hook system (`add_action`, `add_filter`)
- Script/style enqueuing

**Configuration:** [`../../phpunit.xml`](../../phpunit.xml)  
PHPUnit 10.5 configuration with:
- Test discovery in `tests/php/action-pack/`
- Plugin source coverage tracking
- Test constants (`EMFN_ACTION_PACK_PLUGIN_VERSION`, `WP_DEBUG_LOG`)

**Requirements:**
- PHP 8.3+ (included in devcontainer)
- Composer (for installing PHPUnit and WordPress stubs)
- Xdebug (for coverage reports, included in devcontainer)

## Coming Next

### Version-Keyed Cache Testing (Day 3)
Test that transient cache keys include version numbers and invalidate correctly on updates.

### Query Loop Filtering (Future)
Test WordPress Query Loop block filtering based on decoded category IDs.

## Shared Test Data

- [`../fixtures/payload-test-cases.json`](../fixtures/payload-test-cases.json) — Round-trip test cases shared with JavaScript tests
- Data provider pattern used for parameterized tests
