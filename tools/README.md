# Tools & Development Resources

This directory contains development utilities and resources that support the Emergency Mode project but are not deployed to the WordPress site.

## Contents

- **`scripts/`** - Development scripts and utilities
  - `SheetsWPAppScript.js` - Google Apps Script for fetching WordPress REST API data into Google Sheets
- **`styles/`** - CSS snippets and reference styles  
  - `siteCustomRules.css` - CSS reference file
- **`templates/`** - HTML templates and code snippets
  - `liteSitesFooter.html` - Footer template for lite sites

> **Note:** `ga.txt` is still in `/tmp/` and should be moved here when ready.

## Purpose

Files in this directory are:
- ✅ Tracked in GitHub for version control
- ✅ Ignored by WordPress deployment (not synced to the site)
- ✅ Available for development, documentation and reference

## WordPress Sync

Only the `plugins/` directory is synced to the WordPress site. Everything else in this repository (including `tools/`, `scripts/`, `notebooks/`, etc.) remains development-only.
