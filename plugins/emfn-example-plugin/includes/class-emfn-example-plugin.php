<?php
/**
 * Main plugin class for EMFN Example Plugin.
 *
 * @package EMFN_Example_Plugin
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

/**
 * Class EMFN_Example_Plugin
 *
 * Singleton that wires up all hooks for the plugin.
 */
class EMFN_Example_Plugin {

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
     * Enqueue front-end CSS and JS.
     *
     * By default assets are loaded on every front-end request.
     * Uncomment the conditional below (or add your own) to limit
     * loading to specific post types, templates, or shortcode presence.
     */
    public function enqueue_assets() {
        // Example: only load on single posts.
        // if ( ! is_singular( 'post' ) ) {
        //     return;
        // }

        wp_enqueue_style(
            'emfn-example-plugin',
            EMFN_EXAMPLE_PLUGIN_URL . 'assets/css/emfn-example-plugin.css',
            array(),
            EMFN_EXAMPLE_PLUGIN_VERSION
        );

        wp_enqueue_script(
            'emfn-example-plugin',
            EMFN_EXAMPLE_PLUGIN_URL . 'assets/js/emfn-example-plugin.js',
            array(),
            EMFN_EXAMPLE_PLUGIN_VERSION,
            true
        );
    }
}
