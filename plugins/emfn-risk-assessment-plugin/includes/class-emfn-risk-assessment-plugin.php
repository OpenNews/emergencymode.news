<?php
/**
 * Main plugin class for EMFN Risk Assessment Plugin.
 *
 * @package EMFN_Risk_Assessment_Plugin
 *

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

/**
 * Class EMFN_Risk_Assessment_Plugin
 *
 * Singleton that wires up all hooks for the plugin.
 */
class EMFN_Risk_Assessment_Plugin {

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
            'emfn-risk-assessment-plugin',
            EMFN_RISK_ASSESSMENT_PLUGIN_URL . 'assets/css/emfn-risk-assessment-plugin.css',
            array(),
            EMFN_RISK_ASSESSMENT_PLUGIN_VERSION
        );

        wp_enqueue_script(
            'emfn-risk-assessment-plugin',
            EMFN_RISK_ASSESSMENT_PLUGIN_URL . 'assets/js/emfn-risk-assessment-plugin.js',
            array(),
            EMFN_RISK_ASSESSMENT_PLUGIN_VERSION,
            true
        );

        // Expose the data directory URL to JS so it can fetch per-state NRI CSVs.
        wp_localize_script(
            'emfn-risk-assessment-plugin',
            'emfnData',
            array(
                'dataUrl' => EMFN_RISK_ASSESSMENT_PLUGIN_URL . 'assets/data',
            )
        );
    }
}
