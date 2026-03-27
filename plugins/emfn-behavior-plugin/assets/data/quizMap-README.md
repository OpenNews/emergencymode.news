# Quiz Map CSV

This CSV file maps quiz answers to WordPress category slugs for the Action Pack Assessment form.

## Structure

The CSV has three columns:
- **slug**: WordPress category slug to be associated with this answer
- **answer**: The answer value from the form (can be text or numeric)
- **mode**: Optional mode filter (before, during, after). If specified, the mapping only applies when the quiz's mode field matches this value.

## How It Works

When a user submits the quiz:
1. The system extracts their answers for: mode, size, offlineResiliency, pubSituation, and disInfo
2. It reads this CSV file and matches their answers against the "answer" column
3. If a "mode" value is specified in the CSV, it also checks that the user's mode matches
4. All matching category slugs are collected
5. These categories (along with the quiz data) are hashed into a short code
6. The hash is appended to the confirmation page URL as `actionPack={hash}`

## Future Use

The category mappings stored here will be used in the future to:
- Automatically tag or categorize content based on user quiz responses
- Display personalized action packs based on the user's situation
- Track analytics for different user segments

## Example Entries

```csv
slug,answer,mode
emergency-preparedness,before,before
during-crisis-response,during,during
individual-household,1,
offline-excellent,3,
```

This maps:
- "before" answer → "emergency-preparedness" category (only when mode is "before")
- "during" answer → "during-crisis-response" category (only when mode is "during")
- Size value "1" → "individual-household" category (applies to all modes)
- Offline resiliency "3" → "offline-excellent" category (applies to all modes)
