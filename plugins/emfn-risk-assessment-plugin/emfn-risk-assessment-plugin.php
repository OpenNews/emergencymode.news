<?php
/**
 * Plugin Name:       EMFN Risk Assessment Plugin
 * Plugin URI:        https://github.com/OpenNews/emergencymode.news
 * Description:       Custom plugin to surface localized risk information and behavior prompts for EMFN.
 * Version:           1.0.0
 * Requires at least: 6.3
 * Requires PHP:      8.0
 * Author:            Emergency Mode / EMFN
 * Author URI:        https://emergencymode.news
 * License:           GPL-2.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       emfn-risk-assessment-plugin
 * Domain Path:       /languages
 *
 * @package EMFN_Risk_Assessment_Plugin
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

define( 'EMFN_RISK_ASSESSMENT_PLUGIN_VERSION', '1.0.0' );
define( 'EMFN_RISK_ASSESSMENT_PLUGIN_DIR', plugin_dir_path( __FILE__ ) );
define( 'EMFN_RISK_ASSESSMENT_PLUGIN_URL', plugin_dir_url( __FILE__ ) );

require_once EMFN_RISK_ASSESSMENT_PLUGIN_DIR . 'includes/class-emfn-risk-assessment-plugin.php';

/**
 * Initialise the plugin.
 */
function emfn_risk_assessment_plugin_init() {
    EMFN_Risk_Assessment_Plugin::get_instance();
}
add_action( 'plugins_loaded', 'emfn_risk_assessment_plugin_init' );
