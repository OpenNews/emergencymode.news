# EMFN Site Styles Plugin

Custom site-wide styles for Emergency Mode (EMFN) built with SASS and compiled to CSS. This plugin provides Newspack-compatible styling without requiring a child theme.

## Overview

**Why a plugin?** Newspack-hosted sites don't support child themes, so custom styles must be delivered via a plugin. This lightweight plugin only registers and enqueues site-wide CSS (and minimal JS), with no custom PHP logic beyond asset registration.

## Structure

```
plugins/emfn-site-styles-plugin/
├── emfn-site-styles-plugin.php          # Main plugin file
├── readme.txt                            # WordPress plugin readme
├── README.md                             # This file
├── includes/
│   └── class-emfn-site-styles-plugin.php # Main plugin class (singleton)
├── assets/
│   ├── css/
│   │   └── emfn-site-styles-plugin.css  # Generated/built CSS (gitignored)
│   ├── scss/
│   │   ├── main.scss                     # Main SASS entry point
│   │   ├── _variables.scss               # SASS variables (colors, breakpoints)
│   │   ├── _mixins.scss                  # SASS mixins/utilities
│   │   └── components/
│   │       ├── _base.scss                # Body, header, backgrounds
│   │       ├── _typography.scss          # Site title, fonts, symbols
│   │       ├── _navigation.scss          # Header, breadcrumbs, nav buttons
│   │       ├── _content.scss             # Blockquotes, HR, tables, details
│   │       ├── _footer.scss              # Footer widgets and text
│   │       ├── _action-pack.scss         # Action Pack quiz & results
│   │       ├── _content-cards.scss       # Content loop cards
│   │       ├── _categories.scss          # Category pills & colors
│   │       ├── _sponsors.scss            # Sponsor/partner labels
│   │       ├── _search.scss              # Jetpack AI search
│   │       ├── _buttons.scss             # Big CTA buttons
│   │       ├── _hero.scss                # Homepage hero & animations
│   │       ├── _faq.scss                 # Yoast FAQ styling
│   │       └── _facetwp.scss             # FacetWP search results
│   └── js/
│       └── emfn-site-styles-plugin.js   # Optional JS (hero animation, etc.)
└── languages/                            # I18n folder (standard WP)
```

## SASS Component Organization

### Base Components
- **`_variables.scss`**: Theme colors, fonts, spacing, breakpoints extracted from CSS custom properties
- **`_mixins.scss`**: Reusable mixins for rounded corners, shadows, transitions
- **`_base.scss`**: Body background, header backdrop blur

### Feature Components
- **`_typography.scss`**: Site title, material symbols font, text styles
- **`_navigation.scss`**: Header positioning, breadcrumbs, nav buttons, tertiary nav
- **`_content.scss`**: Blockquotes, HR rules, tables (`.emfn-table`), details blocks
- **`_footer.scss`**: Above-footer widgets, site-info text
- **`_action-pack.scss`**: Quiz action items, FEMA risks, quiz-specific styling
- **`_content-cards.scss`**: `.emfn-content-cards.wpnbha` styles, republishable variants
- **`_categories.scss`**: Category pill styles with tetradic color variants
  - Disaster: `#e7bbb4`
  - Challenge: `#b4e7bb`
  - Type: `#b4e0e7`
  - Newsroom: `#e7b4e0`
  - Default: `#f1f1f1`
- **`_sponsors.scss`**: Sponsor label hiding, category flag management
- **`_search.scss`**: Jetpack AI search overrides
- **`_buttons.scss`**: Big buttons with material symbols, hover effects
- **`_hero.scss`**: Homepage hero, disaster word animation
- **`_faq.scss`**: Yoast schema FAQ styling
- **`_facetwp.scss`**: FacetWP result cards, search bar, filters

## Build System

### Prerequisites

```bash
npm install
```

This installs `sass` as a dev dependency (already in `package.json`).

### Build Commands

```bash
# Development build (expanded, with source maps)
npm run build:styles:dev

# Production build (compressed)
npm run build:styles

# Watch mode (auto-rebuild on changes)
npm run watch:styles

# Build all project assets
npm run build
```

### Generated Files

The build process generates:
- `assets/css/emfn-site-styles-plugin.css` - Compiled CSS (gitignored)
- `assets/css/emfn-site-styles-plugin.css.map` - Source maps for dev (gitignored)

**These files are excluded from version control** but must be built before deployment.

## Development Workflow

1. **Start watch mode:**
   ```bash
   npm run watch:styles
   ```

2. **Edit SASS files** in `assets/scss/` or `assets/scss/components/`

3. **Changes auto-compile** to `assets/css/emfn-site-styles-plugin.css`

4. **Refresh browser** to see changes (WordPress auto-loads latest version via `EMFN_SITE_STYLES_PLUGIN_VERSION`)

5. **Before committing:**
   ```bash
   npm run build:styles  # Generate production CSS
   ```

## PHP Architecture

### Main Plugin Class

`EMFN_Site_Styles_Plugin` (singleton pattern):
- **No complex logic** - only asset enqueuing
- **Site-wide enqueuing** - no conditional loading
- **Single hook:** `wp_enqueue_scripts`

### Key Differences from Action Pack Plugin

| Feature | Action Pack | Site Styles |
|---------|-------------|-------------|
| **Scope** | Conditional (Action Pack pages only) | Site-wide (always) |
| **Logic** | Complex PHP (queries, scoring, filtering) | Minimal PHP (enqueue only) |
| **Assets** | JS + CSS + Data files | CSS + minimal JS |
| **Enqueue condition** | `is_action_pack_page_request()` | No condition (always) |
| **Build step** | No | Yes (SASS → CSS) |

## Version Management

Update version in **both** files when releasing:
1. `emfn-site-styles-plugin.php` - Plugin header and constant
2. `package.json` - Version field

## Migration from Legacy CSS

Original CSS location: `/tools/styles/siteCustomRules.css`

**Migration steps:**
1. ✅ Extract variables from existing CSS
2. ✅ Break CSS into SASS component partials
3. ✅ Test build output (compare generated CSS to original)
4. ✅ Deploy to staging
5. ✅ Verify on Newspack site
6. ✅ Remove old CSS reference

## Testing Checklist

- [ ] All 29 CSS sections render correctly
- [ ] Category pill color variations display properly
- [ ] Responsive breakpoints work (782px, 768px)
- [ ] Hero animation functions with generated CSS
- [ ] FacetWP and Content Card styles intact
- [ ] Action Pack quiz rendering correct
- [ ] Visual parity: old CSS vs. new SASS-generated CSS

## Responsive Breakpoints

- `$breakpoint-tablet: 782px` - Breadcrumb and header adjustments
- `$breakpoint-mobile: 768px` - Column stacking, layout changes

## Color Palette

### Primary Colors
- **Primary:** `#c1503d` (EMFN red)
- **Primary Dark:** `#9f2d00`
- **Background:** `rgb(249, 248, 246)` (warm off-white)
- **Border:** `#b7b4af`

### Category Colors (Tetradic from `#e7bbb4`)
- **Disaster:** `#e7bbb4` (pink/peach)
- **Challenge:** `#b4e7bb` (mint green)
- **Type:** `#b4e0e7` (light cyan)
- **Newsroom:** `#e7b4e0` (lavender)
- **Default:** `#f1f1f1` (light gray)

## License

MIT License - See LICENSE file in repository root
