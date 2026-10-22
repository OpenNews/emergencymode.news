<?php
/**
 * Router for PHP's built-in server, used by SaveDataTest to observe real response headers.
 * `?admin=1` simulates an admin request.
 */

require dirname( __DIR__ ) . '/bootstrap.php';
require dirname( __DIR__, 3 ) . '/plugins/emfn-site-styles-plugin/includes/class-emfn-site-styles-plugin.php';

global $_test_is_admin;
$_test_is_admin = isset( $_GET['admin'] );

EMFN_Site_Styles_Plugin::get_instance()->send_vary_header();
echo 'ok';
