=== EMFN Site Styles Plugin ===
Contributors:       tiffehr
Tags:               newspack, emergency-mode-for-news, nclocal, opennews
Requires at least:  6.3
Tested up to:       7.0
Stable tag:         0.1.0
Requires PHP:       8.0
License:            MIT
License URI:        https://opensource.org/licenses/MIT

Custom site-wide CSS and JS for Emergency Mode (EMFN). 
Optional build process to generate both, in the future.

== Description ==

This lightweight plugin provides custom styling for the Emergency Mode website (emergencymode.news) running on Newspack. Since Newspack-hosted sites don't support child themes, this plugin delivers site-wide CSS through WordPress's standard enqueue system.

**Features:**

* Site-wide custom styles for EMFN
* Responsive design with mobile and tablet breakpoints
* Category-specific color coding for content organization
* Custom components for Action Pack, hero sections, FAQs and more
* No complex PHP logic - only asset enqueuing

== Installation ==

1. Upload the `emfn-site-styles-plugin` folder to `/wp-content/plugins/`
2. Activate the plugin through the 'Plugins' menu in WordPress
3. Styles will automatically be applied site-wide
4. Remove anything pulled from the _Customize > Additional CSS_ menu that has been saved here and re-Publish the site

== Changelog ==

= Releases =

* GitHub drives release versions and history
* Please see GitHub: https://github.com/OpenNews/emergencymode.news/releases
