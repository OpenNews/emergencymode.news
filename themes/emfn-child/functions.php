<?php
/**
 * EMFN Child Theme – functions.php
 *
 * Enqueues the parent Newspack theme's stylesheet, the child theme's
 * stylesheet, and optional custom CSS/JS assets.
 *
 * @package EMFN_Child
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

/**
 * Enqueue parent and child theme stylesheets plus custom assets.
 */
function emfn_child_enqueue_assets() {
    $parent_style = 'newspack-style';

    // Parent theme stylesheet.
    wp_enqueue_style(
        $parent_style,
        get_template_directory_uri() . '/style.css',
        array(),
        wp_get_theme( get_template() )->get( 'Version' )
    );

    // Child theme stylesheet (style.css in theme root).
    wp_enqueue_style(
        'emfn-child-style',
        get_stylesheet_uri(),
        array( $parent_style ),
        wp_get_theme()->get( 'Version' )
    );

    // Additional child theme CSS overrides.
    wp_enqueue_style(
        'emfn-child-css',
        get_stylesheet_directory_uri() . '/assets/css/emfn-child.css',
        array( 'emfn-child-style' ),
        wp_get_theme()->get( 'Version' )
    );

    // Additional child theme JS.
    wp_enqueue_script(
        'emfn-child-js',
        get_stylesheet_directory_uri() . '/assets/js/emfn-child.js',
        array(),
        wp_get_theme()->get( 'Version' ),
        true
    );
}
add_action( 'wp_enqueue_scripts', 'emfn_child_enqueue_assets' );
