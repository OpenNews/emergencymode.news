<?php
/**
 * PHPUnit Bootstrap File
 * Sets up test environment for plugin tests
 */

// Prevent direct access
if ( ! defined( 'PHPUNIT_RUNNING' ) ) {
    define( 'PHPUNIT_RUNNING', true );
}

// Define WordPress ABSPATH constant
if ( ! defined( 'ABSPATH' ) ) {
    define( 'ABSPATH', '/tmp/wordpress/' );
}

// Define plugin constants if not already defined
if ( ! defined( 'EMFN_ACTION_PACK_PLUGIN_VERSION' ) ) {
    define( 'EMFN_ACTION_PACK_PLUGIN_VERSION', '0.0.9' );
}

if ( ! defined( 'EMFN_ACTION_PACK_PLUGIN_DIR' ) ) {
    define( 'EMFN_ACTION_PACK_PLUGIN_DIR', dirname( __DIR__, 2 ) . '/plugins/emfn-action-pack-plugin/' );
}

if ( ! defined( 'WP_DEBUG_LOG' ) ) {
    define( 'WP_DEBUG_LOG', false );
}

// Define WordPress time constants
if ( ! defined( 'DAY_IN_SECONDS' ) ) {
    define( 'DAY_IN_SECONDS', 24 * 60 * 60 );
}

// Load Composer autoloader if it exists (for future use)
$autoload_path = dirname( __DIR__, 2 ) . '/vendor/autoload.php';
if ( file_exists( $autoload_path ) ) {
    require_once $autoload_path;
}

// Define WordPress test stubs for functions we use
if ( ! function_exists( 'get_transient' ) ) {
    function get_transient( $transient ) {
        global $_test_transients;
        return $_test_transients[ $transient ] ?? false;
    }
}

if ( ! function_exists( 'set_transient' ) ) {
    function set_transient( $transient, $value, $expiration = 0 ) {
        global $_test_transients;
        $_test_transients[ $transient ] = $value;
        return true;
    }
}

if ( ! function_exists( 'delete_transient' ) ) {
    function delete_transient( $transient ) {
        global $_test_transients;
        unset( $_test_transients[ $transient ] );
        return true;
    }
}

if ( ! function_exists( 'esc_html' ) ) {
    function esc_html( $text ) {
        return htmlspecialchars( $text, ENT_QUOTES, 'UTF-8' );
    }
}

if ( ! function_exists( 'esc_attr' ) ) {
    function esc_attr( $text ) {
        return htmlspecialchars( $text, ENT_QUOTES, 'UTF-8' );
    }
}

if ( ! function_exists( 'wp_kses_post' ) ) {
    function wp_kses_post( $data ) {
        return $data; // Simplified for testing
    }
}

if ( ! function_exists( 'wp_json_encode' ) ) {
    function wp_json_encode( $data, $options = 0, $depth = 512 ) {
        return json_encode( $data, $options, $depth );
    }
}

if ( ! function_exists( 'add_action' ) ) {
    function add_action( $tag, $function_to_add, $priority = 10, $accepted_args = 1 ) {
        // Mock implementation for testing
        return true;
    }
}

if ( ! function_exists( 'add_filter' ) ) {
    function add_filter( $tag, $function_to_add, $priority = 10, $accepted_args = 1 ) {
        // Mock implementation for testing
        return true;
    }
}

if ( ! function_exists( 'wp_enqueue_script' ) ) {
    function wp_enqueue_script( $handle, $src = '', $deps = array(), $ver = false, $in_footer = false ) {
        return true;
    }
}

if ( ! function_exists( 'wp_enqueue_style' ) ) {
    function wp_enqueue_style( $handle, $src = '', $deps = array(), $ver = false, $media = 'all' ) {
        return true;
    }
}

if ( ! function_exists( 'wp_localize_script' ) ) {
    function wp_localize_script( $handle, $object_name, $l10n ) {
        return true;
    }
}

if ( ! function_exists( 'plugin_dir_url' ) ) {
    function plugin_dir_url( $file ) {
        return 'https://example.com/wp-content/plugins/emfn-action-pack-plugin/';
    }
}

if ( ! function_exists( 'plugin_dir_path' ) ) {
    function plugin_dir_path( $file ) {
        return dirname( __DIR__, 2 ) . '/plugins/emfn-action-pack-plugin/';
    }
}

// Initialize global test transients
global $_test_transients;
$_test_transients = array();

// Note: Plugin class is loaded by individual test files as needed

echo "PHPUnit Bootstrap Complete\n";
