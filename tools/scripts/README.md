# WordPress Data for Google Sheets

Pull live WordPress data directly into Google Sheets for creating pivot tables, dashboards, and reports.

## What This Does

This Google Apps Script connects your Google Sheets to the EmergencyMode.news WordPress site, letting you fetch categories, tags, pages, and posts data using simple formulas—just like `=SUM()` or `=VLOOKUP()`.

## Setup

1. Open your Google Sheet
2. Go to **Extensions → Apps Script**
3. Delete any default code
4. Copy and paste the entire contents of `SheetsWPAppScript.js`
5. Click **Save** (💾 icon)
6. Close the Apps Script tab and return to your Sheet

## Quick Start

### Get All Categories

```
=getCategories()
```

Returns data rows only (no header). Add `TRUE` as the third parameter to include headers:

```
=getCategories("", "", TRUE)
```

This returns a table with columns: `id`, `name`, `slug`, `description`, `parent`, `status`, `count`, `link`

### Get All Posts

```
=getPosts()
```

### Get Specific Category by Slug

```
=getCategories("natural-hazards")
```

### Get Custom Fields

```
=getPosts("", "id,title.rendered,date,author")
```

## Available Functions

### `getCategories(filter, fields, includeHeaders, parentId)`

Fetch WordPress categories.

**Parameters:**
- `filter` (optional): Category ID, slug, or name to search for
- `fields` (optional): Comma-separated list of fields to return
- `includeHeaders` (optional): Set to `TRUE` to include header row (default: `FALSE`)
- `parentId` (optional): Parent category ID to filter by (use `0` for top-level categories only)

**Default fields:** id, name, slug, description, parent, status, count, link

**Examples:**
```
=getCategories()                                  // All categories, no headers
=getCategories("earthquakes")                     // Category with slug "earthquakes"
=getCategories("", "id,name,count,parent")       // All categories, only 4 fields
=getCategories("", "", TRUE)                      // All categories with header row
=getCategories("", "", FALSE, 0)                  // Only top-level categories (no parent)
=getCategories("", "", FALSE, 42)                 // Only categories with parent ID 42
```

### `getTags(filter, fields, includeHeaders)`

Fetch WordPress tags.

**Parameters:**
- `filter` (optional): Tag ID, slug, or name to search for
- `fields` (optional): Comma-separated list of fields to return
- `includeHeaders` (optional): Set to `TRUE` to include header row (default: `FALSE`)

**Default fields:** id, name, slug, description, parent, status, count, link

**Examples:**
```
=getTags()                                 // All tags, no headers
=getTags("breaking-news")                  // Tag with slug "breaking-news"
=getTags("", "id,name,slug,count")        // Custom fields
=getTags("", "", TRUE)                     // All tags with header row
```

### `getPages(filter, fields, includeHeaders)`

Fetch WordPress pages.

**Parameters:**
- `filter` (optional): Page ID, slug, or name to search for
- `fields` (optional): Comma-separated list of fields to return
- `includeHeaders` (optional): Set to `TRUE` to include header row (default: `FALSE`)

**Default fields:** id, name, slug, description, parent, status, count, link

**Examples:**
```
=getPages()                                // All pages, no headers
=getPages("about")                         // Page with slug "about"
=getPages("", "id,title.rendered,link")   // Custom fields
=getPages("", "", TRUE)                    // All pages with header row
```

### `getPosts(filter, fields, includeHeaders)`

Fetch WordPress posts.

**Parameters:**
- `filter` (optional): Post ID, slug, or name to search for
- `fields` (optional): Comma-separated list of fields to return
- `includeHeaders` (optional): Set to `TRUE` to include header row (default: `FALSE`)

**Default fields:** id, name, slug, description, parent, status, count, link

**Examples:**
```
=getPosts()                                          // All posts (up to 100), no headers
=getPosts("wildfire-update")                        // Post with slug "wildfire-update"
=getPosts("", "id,title.rendered,date,categories") // Custom fields
=getPosts("", "", TRUE)                              // All posts with header row
```

### `getWPData(endpoint, filter, fields, includeHeaders)`

Generic function for advanced usage.

**Parameters:**
- `endpoint`: Must be `"categories"`, `"tags"`, `"pages"`, or `"posts"`
- `filter` (optional): Filter value
- `fields` (optional): Comma-separated field list
- `includeHeaders` (optional): Set to `TRUE` to include header row (default: `FALSE`)

**Default fields:** id, name, slug, description, parent, status, count, link

**Example:**
```
=getWPData("posts", "", "id,title.rendered,date,modified")
=getWPData("categories", "", "", TRUE)  // All categories with headers
```

## Common Use Cases

### Creating a Pivot Table from Post Categories

1. In cell `A1`, manually add headers: `id`, `title`, `categories`, `date`

2. In cell `A2`, enter:
   ```
   =getPosts("", "id,title.rendered,categories,date")
   ```

3. Wait for data to load (categories will appear as JSON arrays)

4. Select your data range including headers (A1:D100 or wherever your data ends)

5. Go to **Insert → Pivot table**

6. Configure:
   - Rows: Categories
   - Values: COUNTA of ID (to count posts)

**Tip:** If you prefer headers included automatically, use:
```
=getPosts("", "id,title.rendered,categories,date", TRUE)
```
Then skip step 1.

### Dashboard of Category Counts

```
=getCategories("", "name,count,link", TRUE)
```

This gives you a ready-to-chart table with headers showing how many posts are in each category.

### Recent Posts Report

```
=getPosts("", "id,title.rendered,date,author,status", TRUE)
```

Use this to create a sortable table of recent content with headers. Add filters or conditional formatting based on date or status.

### Tag Cloud Data

```
=getTags("", "name,count", TRUE)
```

Perfect for creating a visual tag cloud or bar chart showing which topics get the most coverage.

### Hierarchical Category Structure

Get only top-level categories (no parent):
```
=getCategories("", "id,name,count,parent", TRUE, 0)
```

Get subcategories of a specific parent category (e.g., parent ID 42):
```
=getCategories("", "id,name,count,parent", TRUE, 42)
```

Build a category hierarchy report by combining multiple queries at different parent levels.

## Available Fields

### Categories & Tags
- `id` - Unique identifier
- `name` - Display name
- `slug` - URL-friendly name
- `description` - Full description
- `parent` - Parent category/tag ID (0 if top-level)
- `count` - Number of posts with this term
- `link` - URL to the archive page

### Posts & Pages
- `id` - Unique identifier
- `slug` - URL-friendly name
- `status` - publish, draft, pending, etc.
- `type` - post, page, etc.
- `link` - Full URL
- `title.rendered` - Post/page title (HTML rendered)
- `content.rendered` - Full content (HTML rendered)
- `excerpt.rendered` - Excerpt (HTML rendered)
- `author` - Author ID
- `date` - Publication date (ISO 8601)
- `modified` - Last modified date
- `categories` - Array of category IDs
- `tags` - Array of tag IDs

**Note:** For nested fields like `title.rendered`, use dot notation in the fields parameter.

## Tips & Tricks

### Headers

By default, all functions return data without header rows. This makes it easy to combine multiple queries or append data over time. 

To include headers, add `TRUE` as the last parameter:
```
=getCategories("", "", TRUE)      // With headers
=getCategories()                  // Without headers (default)
```

### Refreshing Data

Google Sheets doesn't auto-refresh custom functions. To force a refresh:
1. Add a dummy parameter: `=getPosts("", "id,title.rendered")` → `=getPosts("", "id,title.rendered")`
2. Or change a parameter temporarily
3. Or use **Data → Calculate now** (Cmd/Ctrl + R)

### Dealing with Arrays (Categories/Tags in Posts)

When you fetch posts with categories or tags, they appear as JSON arrays like `[1,2,3]`. To work with these:

1. Copy the data
2. **Edit → Paste special → Paste values only**
3. Use the **SPLIT()** function: `=SPLIT(SUBSTITUTE(SUBSTITUTE(A2,"[",""),"]",""),",")`

### Performance

- Each function fetches up to 100 items by default
- If you need more, call the function multiple times with different filters
- For large datasets, consider filtering by specific categories/tags first

### Filtering by ID vs Slug

The script automatically detects what you're filtering by:
- Numbers (e.g., `12` or `"12"`) → Search by ID
- Lowercase with hyphens (e.g., `"my-category"`) → Search by slug
- Anything else → Search by name (fuzzy search)

### Filtering Categories by Parent

Use the fourth parameter in `getCategories()` to filter by parent category:
- `0` - Only top-level categories (no parent)
- `42` - Only subcategories of category ID 42
- Omit the parameter - All categories regardless of parent

**Example:** Build a two-level category report
```
// Get top-level categories
=getCategories("", "id,name,count", TRUE, 0)

// Get subcategories of category ID 5
=getCategories("", "id,name,count,parent", TRUE, 5)
```

### Creating Time-Series Data

Use filtered queries to build time-based reports:

```
=getPosts("", "date,title.rendered,categories")
```

Then use pivot tables to group by month/year or create trend charts.

## Troubleshooting

**"Invalid endpoint" error**  
Only `categories`, `tags`, `pages`, and `posts` are supported.

**No data appears**  
Check that the filter value exists. Try without a filter first: `=getCategories()`

**Too much data**  
Limit the fields you fetch: `=getPosts("", "id,title.rendered")` instead of all default fields.

**JSON in cells**  
Complex fields (like categories, author objects) appear as JSON. Use **Paste special → Values** and then parse with formulas if needed.

## Advanced: Custom Field Combinations

Combine data from multiple functions using VLOOKUP or INDEX/MATCH:

1. Get posts in A1: `=getPosts("", "id,title.rendered,categories")`
2. Get category names in E1: `=getCategories("", "id,name")`
3. Use VLOOKUP to match category IDs to names

## Support

For issues with the WordPress API or available fields, visit:
https://developer.wordpress.org/rest-api/reference/

---

**Note:** This script connects to `emergencymode.newspackstaging.com`. Data updates in real-time based on the WordPress site's current content.
