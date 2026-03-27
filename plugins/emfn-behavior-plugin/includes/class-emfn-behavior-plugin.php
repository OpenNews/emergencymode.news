<?php
/**
 * Main plugin class for EMFN Behavior Plugin.
 *
 * @package EMFN_Behavior_Plugin
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

/**
 * Class EMFN_Behavior_Plugin
 *
 * Singleton that wires up all hooks for the plugin.
 */
class EMFN_Behavior_Plugin {

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
        
        // Initialize Gravity Forms handler if Gravity Forms is active.
        add_action( 'init', array( $this, 'init_gravity_forms_handler' ) );
    }

    /**
     * Initialize the Gravity Forms handler.
     */
    public function init_gravity_forms_handler() {
        // Check if Gravity Forms is active.
        if ( class_exists( 'GFForms' ) ) {
            require_once EMFN_BEHAVIOR_PLUGIN_DIR . 'includes/class-emfn-gravity-forms-handler.php';
            EMFN_Gravity_Forms_Handler::get_instance();
        }
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
            'emfn-behavior-plugin',
            EMFN_BEHAVIOR_PLUGIN_URL . 'assets/css/emfn-behavior-plugin.css',
            array(),
            EMFN_BEHAVIOR_PLUGIN_VERSION
        );

        wp_enqueue_script(
            'emfn-behavior-plugin',
            EMFN_BEHAVIOR_PLUGIN_URL . 'assets/js/emfn-behavior-plugin.js',
            array(),
            EMFN_BEHAVIOR_PLUGIN_VERSION,
            true
        );

        // Expose the data directory URL to JS so it can fetch per-state NRI CSVs.
        wp_localize_script(
            'emfn-behavior-plugin',
            'emfnData',
            array(
                'dataUrl' => EMFN_BEHAVIOR_PLUGIN_URL . 'assets/data',
            )
        );
    }
}
