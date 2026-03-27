# Gravity Forms Integration

This document explains the Gravity Forms integration for the EMFN Action Pack Assessment quiz.

## Overview

The integration hooks into Gravity Forms to:
1. Process quiz responses and generate a short, shareable hash code
2. Map quiz answers to WordPress categories for future content personalization
3. Append the hash to the confirmation page URL for tracking and sharing

## Components

### Files

- **`includes/class-emfn-gravity-forms-handler.php`**: Main handler class that registers Gravity Forms hooks
- **`assets/data/quizMap.csv`**: CSV mapping quiz answers to WordPress category slugs
- **`assets/data/quizMap-README.md`**: Documentation for the quiz map CSV structure

### Hooks Used

1. **`gform_pre_submission`** (Priority 10)
   - Fired before form submission is processed
   - Extracts quiz data from POST variables
   - Generates hash from quiz responses
   - Maps answers to categories using quizMap.csv
   - Stores data in transient for later use

2. **`gform_confirmation`** (Priority 10)
   - Filters the confirmation message/redirect
   - Replaces `actionPack=tbd` with `actionPack={hash}`
   - Works with redirect URLs, confirmation pages, and HTML messages
   - Cleans up transient data

3. **`gform_submission_started`** (Priority 10)
   - Preserves any existing `actionPack` parameter from query string
   - Stores in transient to maintain continuity

## Quiz Data Fields

The integration expects these form fields (all optional):

| Field Name | POST Variable | Values | Description |
|------------|---------------|--------|-------------|
| Mode | `input_mode` | before, during, after | Emergency timeline |
| Size | `input_size` | 1, 5, 10, 25, 26 | Household/group size |
| Offline Resiliency | `input_offline_resiliency` | 0-3 | Level of offline capability |
| Publication Situation | `input_pub_situation` | 0-4 | Publishing context |
| Disinformation | `input_dis_info` | 0-3 | Disinformation threat level |

## Hash Generation

The hash is generated using:
1. All answered quiz fields are sorted alphabetically by key
2. Concatenated into a string: `key1:value1|key2:value2|...`
3. CRC32 hash is computed
4. Converted to base36 (0-9, a-z) for compactness
5. Lowercased for consistency

Example: Quiz data `{mode: "before", size: "5"}` → Hash: `1k3m9p2`

The hash is:
- **Short**: Typically 6-7 characters
- **Human-friendly**: Only lowercase alphanumeric
- **Consistent**: Same inputs always produce the same hash
- **URL-safe**: Can be used in query parameters

## Category Mapping

The `quizMap.csv` file defines how quiz answers map to WordPress categories:

```csv
slug,answer,mode
emergency-preparedness,before,before
individual-household,1,
offline-excellent,3,
```

The mapping process:
1. For each answered quiz field
2. Checks if the answer matches any row in the CSV
3. If the CSV row has a mode filter, also verifies mode matches
4. Collects all matching category slugs
5. Removes duplicates

This category data is stored for future use but not currently applied to WordPress categories.

## Confirmation URL Handling

The integration supports multiple confirmation types:

### Redirect Confirmation
```php
array(
    'type' => 'redirect',
    'redirect' => 'https://example.com/thanks?actionPack=tbd'
)
```
Result: `https://example.com/thanks?actionPack=1k3m9p2`

### Page Confirmation
```php
array(
    'type' => 'page',
    'pageId' => 123
)
```
Result: Converts to redirect with hash appended

### HTML Message
If the HTML contains `actionPack=tbd`, it will be replaced with the actual hash.

## Form Setup Instructions

### 1. Create Form Fields

In Gravity Forms, create fields with these input names:
- `input_mode`
- `input_size`
- `input_offline_resiliency`
- `input_pub_situation`
- `input_dis_info`

Or use Gravity Forms field IDs (the integration will need adjustment to use field IDs instead of input names).

### 2. Configure Confirmation

Set up a confirmation that includes `actionPack=tbd` in the URL:

**Option A: Redirect URL**
```
https://emergencymode.news/action-pack/?actionPack=tbd
```

**Option B: Confirmation Page**
Select a confirmation page, and the hash will be appended automatically.

### 3. Customize Quiz Map (Optional)

Edit `assets/data/quizMap.csv` to match your desired category mappings:
- Add rows for each answer value you want to track
- Use the mode column to create mode-specific mappings
- Leave mode blank for mappings that apply to all modes

## Future Enhancements

The current implementation is a foundation for:
1. **Automatic content tagging**: Apply mapped categories to posts
2. **Personalized recommendations**: Show content based on quiz results
3. **Analytics**: Track which combinations of answers are most common
4. **A/B testing**: Test different category mappings
5. **Progressive enhancement**: Add more quiz fields without breaking existing hashes

## Technical Notes

### Transients
Data is stored in WordPress transients with 1-hour expiration:
- `emfn_action_pack_{form_id}`: Quiz data, hash, and categories
- `emfn_preserved_action_pack_{form_id}`: Preserved actionPack parameter

### Security
- All POST data is sanitized using `sanitize_text_field()`
- WordPress nonces are handled by Gravity Forms
- File paths use WordPress constants to prevent directory traversal

### Performance
- CSV is read from disk on each submission (acceptable for low-volume forms)
- Transients are automatically cleaned up after use
- Consider caching CSV data in production if form volume is high

## Troubleshooting

### Hash not appearing in URL
1. Check that Gravity Forms is active (`class_exists('GFForms')`)
2. Verify the confirmation includes `actionPack=tbd`
3. Check PHP error logs for issues reading quizMap.csv
4. Ensure transients are working (check database or object cache)

### Wrong categories mapped
1. Review quizMap.csv for typos or incorrect mappings
2. Check that CSV is properly formatted (no extra quotes, correct delimiters)
3. Verify mode filters are correct

### Field data not captured
1. Ensure POST variable names match expected values
2. Check that form fields are not conditionally hidden
3. Verify form is not using AJAX submission (handler supports both)

## Development

To modify the integration:

1. **Change hash algorithm**: Edit `generate_hash()` method
2. **Add new fields**: Update `extract_quiz_data()` method
3. **Modify category logic**: Edit `map_to_categories()` method
4. **Handle errors**: Add error logging in hook methods

## References

- [Gravity Forms `gform_pre_submission` documentation](https://docs.gravityforms.com/gform-pre-submission/)
- [Gravity Forms `gform_confirmation` documentation](https://docs.gravityforms.com/gform-confirmation/)
- [Gravity Forms `gform_submission_started` documentation](https://docs.gravityforms.com/gform-submission-started/)
