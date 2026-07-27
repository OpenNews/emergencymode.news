<?php
/**
 * Plugin Name:       EMFN Site Styles Plugin
 * Plugin URI:        https://github.com/OpenNews/emergencymode.news/tree/main/plugins/emfn-site-styles-plugin/
 * Description:       Custom site-wide styles for EMFN (Newspack-compatible, no child theme needed).
 * Version:           0.4.0
 * Requires at least: 6.3
 * Requires PHP:      8.0
 * Author:            Emergency Mode / EMFN
 * Author URI:        https://emergencymode.news
 * License:           MIT
 * License URI:       https://opensource.org/licenses/MIT
 * Text Domain:       emfn-site-styles-plugin
 * Domain Path:       /languages
 *
 * @package EMFN_Site_Styles_Plugin
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'EMFN_SITE_STYLES_PLUGIN_VERSION', '0.4.0' );
define( 'EMFN_SITE_STYLES_PLUGIN_DIR', plugin_dir_path( __FILE__ ) );
define( 'EMFN_SITE_STYLES_PLUGIN_URL', plugin_dir_url( __FILE__ ) );

require_once EMFN_SITE_STYLES_PLUGIN_DIR . 'includes/class-emfn-site-styles-plugin.php';

/**
 * Initialise the plugin.
 */
function emfn_site_styles_plugin_init() {
	EMFN_Site_Styles_Plugin::get_instance();
}
add_action( 'plugins_loaded', 'emfn_site_styles_plugin_init' );
