# Future Enhancement: SASS Build System

This document describes a planned enhancement to migrate the EMFN Site Styles Plugin from plain CSS to a SASS-based build system. **This is not currently implemented.**

## Current State

The plugin currently enqueues plain CSS from `assets/css/emfn-site-styles-plugin.css` which is committed to the repository. Changes are made directly to the CSS file.

## Proposed Build Commands

```bash
# Development build (expanded, with source maps)
npm run build:styles:dev

# Production build (compressed)
npm run build:styles

# Watch mode (auto-rebuild on changes)
npm run watch:styles
```

## Proposed SASS Structure

```
assets/
├── scss/
│   ├── main.scss                     # Main SASS entry point
│   ├── _variables.scss               # Theme colors, fonts, spacing
│   ├── _mixins.scss                  # Reusable mixins
│   └── components/
│       ├── _base.scss                # Body, header, backgrounds
│       ├── _typography.scss          # Site title, fonts
│       ├── _navigation.scss          # Header, breadcrumbs
│       ├── _content.scss             # Blockquotes, tables
│       ├── _footer.scss              # Footer widgets
│       ├── _action-pack.scss         # Action Pack quiz
│       ├── _content-cards.scss       # Content loop cards
│       ├── _categories.scss          # Category pills & colors
│       ├── _sponsors.scss            # Sponsor labels
│       ├── _search.scss              # Jetpack AI search
│       ├── _buttons.scss             # Big CTA buttons
│       ├── _hero.scss                # Homepage hero
│       ├── _faq.scss                 # Yoast FAQ
│       └── _facetwp.scss             # FacetWP search
└── css/
    ├── emfn-site-styles-plugin.css   # Currently committed, would become generated
    └── emfn-site-styles-plugin.css.map # Source maps (generated)
```

## Migration Plan

### Prerequisites

- [ ] Add `sass` to npm devDependencies
- [ ] Add build scripts to `package.json`
- [ ] Add `.gitignore` entries for generated CSS

### Migration Steps

1. [ ] Extract CSS variables to `_variables.scss`
2. [ ] Break monolithic CSS into component partials
3. [ ] Set up SASS compilation
4. [ ] Compare generated CSS to original (diff check)
5. [ ] Test on staging environment
6. [ ] Verify visual parity across all pages
7. [ ] Deploy to production
8. [ ] Remove committed CSS, gitignore generated files

## Testing Checklist

- [ ] Category pill color variations display properly
- [ ] Responsive breakpoints work (782px, 768px)
- [ ] Hero animation functions correctly
- [ ] FacetWP and Content Card styles intact
- [ ] Action Pack quiz rendering correct
- [ ] Visual parity: old CSS vs. new SASS-generated CSS

## Benefits of SASS Migration

- **Better organization**: CSS split into logical component files
- **Variables**: Theme colors, fonts, spacing defined once
- **Mixins**: Reusable patterns for shadows, transitions, etc.
- **Maintainability**: Easier to find and update specific styles
- **Development workflow**: Watch mode for rapid iteration
