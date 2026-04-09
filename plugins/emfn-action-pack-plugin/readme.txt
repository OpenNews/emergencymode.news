=== EMFN Action Pack Plugin ===
Contributors:       tiffehr, areimer
Tags:               newspack, emergency-mode-for-news
Requires at least:  6.3
Tested up to:       6.9
Stable tag:         1.0.0
Requires PHP:       8.0
License: GNU General Public License v3 or later
License URI: http://www.gnu.org/licenses/gpl-3.0.html

Power the Action Pack enhancement of Gravity Forms for EMFN

== Description ==

PHP, JS, CSS & data for the Action Pack feature built on top of 
Gravity Forms for emergencymode.news:
- client-side JS to fetch and display distaster risk information after geolocation
- client-side JS to encode form responses into a share-/save-ready Action Pack payload using the CSV-backed token registry
- server-side PHP to decode Action Pack payloads and filter Newspack Query Loops by mapped categories
- custom styles for disaster risk reporting

== Installation ==

1. Upload the `emfn-action-pack-plugin` folder to `wp-content/plugins/`.
2. Activate the plugin through the *Plugins* menu in WordPress Admin.

== Changelog ==

= 1.0.0 =
* initial plugin creation