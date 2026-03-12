<?php
/**
 * EMFN Must-Use Plugin Loader
 *
 * Drop files in this directory to have them load automatically on every
 * page request, before regular plugins, without requiring activation.
 *
 * Use sparingly – only for critical, always-on functionality.
 *
 * @package EMFN
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

// Explicitly list every file in the mu-plugins/emfn/ subdirectory that
// should be loaded. Using an allowlist prevents unintended files (e.g.
// accidental uploads) from being executed automatically.
$emfn_mu_files = array(
    // 'emfn/example-utility.php',
);

$emfn_mu_dir = __DIR__ . '/';
foreach ( $emfn_mu_files as $emfn_mu_file ) {
    $emfn_mu_path = realpath( $emfn_mu_dir . $emfn_mu_file );
    // Ensure the resolved path is still inside the mu-plugins directory.
    if ( $emfn_mu_path && str_starts_with( $emfn_mu_path, $emfn_mu_dir ) ) {
        require_once $emfn_mu_path;
    }
}
