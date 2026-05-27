=== EMFN Site Styles Plugin ===
Contributors: opennews, emergencymode
Tags: styles, css, newspack, custom-styles
Requires at least: 6.3
Tested up to: 6.7
Requires PHP: 8.0
Stable tag: 0.0.1
License: MIT
License URI: https://opensource.org/licenses/MIT

Custom site-wide styles for Emergency Mode (EMFN) built with SASS.

== Description ==

This lightweight plugin provides custom styling for the Emergency Mode website (emergencymode.news) running on Newspack. Since Newspack-hosted sites don't support child themes, this plugin delivers site-wide CSS through WordPress's standard enqueue system.

**Features:**

* Site-wide custom styles compiled from organized SASS components
* Responsive design with mobile and tablet breakpoints
* Category-specific color coding for content organization
* Custom components for Action Pack, hero sections, FAQs, and more
* No complex PHP logic - only asset enqueuing
* Built with modern SASS workflows

**Components Include:**

* Base layout and typography
* Navigation and header customization
* Content cards and category pills
* Action Pack quiz styling
* Homepage hero and animations
* FacetWP search results
* Jetpack AI search overrides
* Big CTA buttons with Material Symbols
* And more...

== Installation ==

1. Upload the `emfn-site-styles-plugin` folder to `/wp-content/plugins/`
2. Activate the plugin through the 'Plugins' menu in WordPress
3. Styles will automatically be applied site-wide

== Development ==

This plugin uses SASS for stylesheet development:

**Build Commands:**
* `npm run build:styles` - Build production CSS
* `npm run build:styles:dev` - Build development CSS with source maps
* `npm run watch:styles` - Watch for changes and auto-rebuild

See README.md for full development documentation.

== Changelog ==

= 0.1.0 =
* Initial release
* SASS-based build system
* Site-wide custom styles
* Component-based organization
