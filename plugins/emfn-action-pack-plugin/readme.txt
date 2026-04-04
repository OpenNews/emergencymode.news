=== EMFN Action Pack Plugin ===
Contributors:       tiffehr, areimer
Tags:               newspack, emergency-mode-for-news
Requires at least:  6.3
Tested up to:       6.9
Stable tag:         1.0.4
Requires PHP:       8.0
License: GNU General Public License v3 or later
License URI: http://www.gnu.org/licenses/gpl-3.0.html

Power the Action Pack enhancement of Gravity Forms for EMFN

== Description ==

PHP, JS, CSS & data for the Action Pack feature built on top of 
Gravity Forms for emergencymode.news:
- client-side JS to fetch and display distaster risk information after geolocation
- client-side JS to 'hash' form responses into a share-/save-ready URL on generated Action Packs
- custom styles for disaster risk reporting

== Installation ==

1. Upload the `emfn-action-pack-plugin` folder to `wp-content/plugins/`.
2. Activate the plugin through the *Plugins* menu in WordPress Admin.

== Changelog ==

= 1.0.4 =
* Added client-side hashing of quiz responses into shareable URLs, saved to Form submissions
= 1.0.3 =
* Drafted quiz category mapping and field extraction support
= 1.0.2 =
* Added risk reporting using Places v2, FCC county FIPS lookup, and FEMA NRI per-state CSV data
= 1.0.1 =
* Attached to geolocation responses to drive Gravity Forms entry data plus custom Action Pack styling
= 1.0.0 =
* initial scaffolding