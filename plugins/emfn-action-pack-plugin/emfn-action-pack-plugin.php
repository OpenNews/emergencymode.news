<?php
/**
 * Plugin Name:       EMFN Action Pack Plugin
 * Plugin URI:        https://github.com/OpenNews/emergencymode.news/tree/main/plugins/emfn-action-pack-plugin/
 * Description:       Custom plugin that drives the Action Pack portion of EMFN's site.
 * Requires at least: 6.3
 * Requires PHP:      8.0
 * Author:            Emergency Mode / EMFN
 * Author URI:        https://emergencymode.news
 * License:           MIT
 * License URI:       https://opensource.org/licenses/MIT
 * Text Domain:       emfn-action-pack-plugin
 * Domain Path:       /languages
 *
 * @package EMFN_Action_Pack_Plugin
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

define( 'EMFN_ACTION_PACK_PLUGIN_VERSION', '1.0.0' );
define( 'EMFN_ACTION_PACK_PLUGIN_DIR', plugin_dir_path( __FILE__ ) );
define( 'EMFN_ACTION_PACK_PLUGIN_URL', plugin_dir_url( __FILE__ ) );

require_once EMFN_ACTION_PACK_PLUGIN_DIR . 'includes/class-emfn-action-pack-plugin.php';

/**
 * Initialise the plugin.
 */
function emfn_action_pack_plugin_init() {
    EMFN_Action_Pack_Plugin::get_instance();
}
add_action( 'plugins_loaded', 'emfn_action_pack_plugin_init' );
