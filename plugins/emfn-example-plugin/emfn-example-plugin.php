<?php
/**
 * Plugin Name:       EMFN Example Plugin
 * Plugin URI:        https://github.com/OpenNews/emergencymode.news
 * Description:       Example scaffold for a Telex-generated plugin used on emergencymode.news.
 * Version:           1.0.0
 * Requires at least: 6.3
 * Requires PHP:      8.0
 * Author:            Emergency Mode / EMFN
 * Author URI:        https://emergencymode.news
 * License:           GPL-2.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       emfn-example-plugin
 * Domain Path:       /languages
 *
 * @package EMFN_Example_Plugin
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

define( 'EMFN_EXAMPLE_PLUGIN_VERSION', '1.0.0' );
define( 'EMFN_EXAMPLE_PLUGIN_DIR', plugin_dir_path( __FILE__ ) );
define( 'EMFN_EXAMPLE_PLUGIN_URL', plugin_dir_url( __FILE__ ) );

require_once EMFN_EXAMPLE_PLUGIN_DIR . 'includes/class-emfn-example-plugin.php';

/**
 * Initialise the plugin.
 */
function emfn_example_plugin_init() {
    EMFN_Example_Plugin::get_instance();
}
add_action( 'plugins_loaded', 'emfn_example_plugin_init' );
