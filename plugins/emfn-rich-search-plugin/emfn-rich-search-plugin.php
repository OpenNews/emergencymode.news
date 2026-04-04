<?php
/**
 * Plugin Name:       EMFN Rich Search Plugin
 * Plugin URI:        https://github.com/OpenNews/emergencymode.news
 * Description:       Custom plugin to support rich search for EMFN.
 * Version:           1.0.0
 * Requires at least: 6.3
 * Requires PHP:      8.0
 * Author:            Emergency Mode / EMFN
 * Author URI:        https://emergencymode.news
 * License:           GPL-2.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       emfn-rich-search-plugin
 * Domain Path:       /languages
 *
 * @package EMFN_Rich_Search_Plugin
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

define( 'EMFN_RICH_SEARCH_PLUGIN_VERSION', '1.0.0' );
define( 'EMFN_RICH_SEARCH_PLUGIN_DIR', plugin_dir_path( __FILE__ ) );
define( 'EMFN_RICH_SEARCH_PLUGIN_URL', plugin_dir_url( __FILE__ ) );

require_once EMFN_RICH_SEARCH_PLUGIN_DIR . 'includes/class-emfn-rich-search-plugin.php';

/**
 * Initialise the plugin.
 */
function emfn_rich_search_plugin_init() {
    EMFN_Rich_Search_Plugin::get_instance();
}
add_action( 'plugins_loaded', 'emfn_rich_search_plugin_init' );
