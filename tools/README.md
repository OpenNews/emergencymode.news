# Tools & Development Resources

This directory contains development utilities and resources that support the Emergency Mode project but are not deployed to the WordPress site.

## Contents

- **`scripts/`** - Development scripts and utilities
  - `SheetsWPAppScript.js` - Google Apps Script for fetching WordPress REST API data into Google Sheets

## Purpose

Files in this directory are:
- ✅ Tracked in GitHub for version control
- ✅ Ignored by WordPress deployment (not synced to the site)
- ✅ Available for development, documentation and reference

## WordPress Sync

Only the `plugins/` directory is synced to the WordPress site. Everything else in this repository (including `tools/`, `scripts/`, `notebooks/`, etc.) remains development-only.


## Plugin "temp" files

Both plugins store HTML snippets in `/assets/html-templates/` that are important to their execution in WordPress but are put in place via Settings, HTML BLocks or other solutions. These serve as version-controlled backups in case those custom elements wander off. They are within the plugin that the fit with.