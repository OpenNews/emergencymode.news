=== EMFN Action Pack Plugin ===
Contributors:       tiffehr
Tags:               newspack, emergency-mode-for-news, nclocal, opennews
Requires at least:  6.3
Tested up to:       6.9
Stable tag:         0.5.0
Requires PHP:       8.0
License:            MIT
License URI:        https://opensource.org/licenses/MIT

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

== External Services ==

This plugin relies on the following external service:

**FCC Census Block API** (https://geo.fcc.gov/api/census/block/find)
- Used for: Geolocation lookup to determine county FIPS codes
- Data sent: User's latitude and longitude coordinates only
- Privacy: No personally identifying information is sent
- License: Public domain (operated by the Federal Communications Commission)

== Dependencies ==

**Gravity Forms**
This plugin is built as an enhancement to Gravity Forms and requires an 
active Gravity Forms installation. The plugin is designed to work within a 
Newspack-managed WordPress environment where Gravity Forms versioning is 
managed as part of the platform. The plugin handles all supported 
Gravity Forms versions available in the Newspack environment and 
does not control or specify a particular Gravity Forms 
version requirement—it simply reacts to the version that is active in the site.

== Changelog ==

= Releases =

* GitHub drives release versions and history
* Please see GitHub: https://github.com/OpenNews/emergencymode.news/releases