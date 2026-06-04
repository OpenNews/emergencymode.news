<?php
/**
 * Main plugin class for EMFN Site Styles Plugin.
 *
 * @package EMFN_Site_Styles_Plugin
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class EMFN_Site_Styles_Plugin
 *
 * Singleton that enqueues site-wide custom styles and scripts.
 */
class EMFN_Site_Styles_Plugin {

	/**
	 * Single instance of this class.
	 *
	 * @var self|null
	 */
	private static $instance = null;

	/**
	 * Return (and lazily create) the singleton instance.
	 *
	 * @return self
	 */
	public static function get_instance() {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	/**
	 * Constructor – registers hooks.
	 */
	private function __construct() {
		add_action( 'wp_enqueue_scripts', array( $this, 'enqueue_assets' ) );
	}

	/**
	 * Enqueue site-wide custom styles and scripts.
	 *
	 * Always enqueues on all frontend pages (no conditional logic).
	 *
	 * @return void
	 */
	public function enqueue_assets() {
		// Skip enqueuing in admin
		if ( is_admin() ) {
			return;
		}

		// Enqueue compiled CSS
		wp_enqueue_style(
			'emfn-site-styles-plugin',
			EMFN_SITE_STYLES_PLUGIN_URL . 'assets/css/emfn-site-styles-plugin.css',
			array(),
			EMFN_SITE_STYLES_PLUGIN_VERSION
		);

		// Enqueue JavaScript (if needed for animations, etc.)
		if ( file_exists( EMFN_SITE_STYLES_PLUGIN_DIR . 'assets/js/emfn-site-styles-plugin.js' ) ) {
			wp_enqueue_script(
				'emfn-site-styles-plugin',
				EMFN_SITE_STYLES_PLUGIN_URL . 'assets/js/emfn-site-styles-plugin.js',
				array(),
				EMFN_SITE_STYLES_PLUGIN_VERSION,
				true
			);
		}
	}
}
