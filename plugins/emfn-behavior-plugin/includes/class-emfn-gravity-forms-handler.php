<?php
/**
 * Gravity Forms integration for EMFN quiz functionality.
 *
 * @package EMFN_Behavior_Plugin
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class EMFN_Gravity_Forms_Handler
 *
 * Handles Gravity Forms hooks for quiz data processing and action pack generation.
 */
class EMFN_Gravity_Forms_Handler {

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
	 * Constructor – registers Gravity Forms hooks.
	 */
	private function __construct() {
		// Confirmation hook to modify the confirmation URL with action pack hash.
		// Hash is computed client-side (JS gform/submission/submission_started) and
		// carried into the submission via the .hashMarker hidden field + GF merge tag.
		add_filter( 'gform_confirmation', array( $this, 'modify_confirmation_url' ), 10, 4 );
	}

	/**
	 * Modify the confirmation URL to include the action pack hash.
	 *
	 * @param string|array $confirmation The confirmation message or redirect URL.
	 * @param array        $form The Gravity Forms form object.
	 * @param array        $entry The form entry.
	 * @param bool         $ajax Whether the form was submitted via AJAX.
	 * @return string|array Modified confirmation.
	 */
	public function modify_confirmation_url( $confirmation, $form, $entry, $ajax ) {
		// Get the stored action pack data.
		$action_pack_data = get_transient( 'emfn_action_pack_' . $form['id'] );
		
		if ( ! $action_pack_data || empty( $action_pack_data['hash'] ) ) {
			return $confirmation;
		}

		$hash = $action_pack_data['hash'];

		// If confirmation is a redirect, modify the URL.
		if ( is_array( $confirmation ) && isset( $confirmation['redirect'] ) ) {
			$confirmation['redirect'] = $this->replace_action_pack_param( $confirmation['redirect'], $hash );
		}

		// If confirmation is a string containing a URL with actionPack=tbd.
		if ( is_string( $confirmation ) && strpos( $confirmation, 'actionPack=tbd' ) !== false ) {
			$confirmation = str_replace( 'actionPack=tbd', 'actionPack=' . $hash, $confirmation );
		}

		// Handle confirmation page redirect.
		if ( is_array( $confirmation ) && 'page' === $confirmation['type'] && isset( $confirmation['pageId'] ) ) {
			$page_url = get_permalink( $confirmation['pageId'] );
			if ( $page_url ) {
				$page_url = $this->replace_action_pack_param( $page_url, $hash );
				$confirmation['redirect'] = $page_url;
				$confirmation['type'] = 'redirect';
			}
		}

		// Clean up transient.
		delete_transient( 'emfn_action_pack_' . $form['id'] );

		return $confirmation;
	}

	/**
	 * Replace actionPack=tbd parameter in a URL with the actual hash.
	 *
	 * @param string $url The URL to modify.
	 * @param string $hash The hash to insert.
	 * @return string Modified URL.
	 */
	private function replace_action_pack_param( $url, $hash ) {
		// Parse the URL.
		$parsed_url = wp_parse_url( $url );
		
		if ( ! isset( $parsed_url['query'] ) ) {
			// No query string, add the parameter.
			return add_query_arg( 'actionPack', $hash, $url );
		}

		parse_str( $parsed_url['query'], $query_params );
		
		// Replace tbd with the actual hash.
		if ( isset( $query_params['actionPack'] ) ) {
			$query_params['actionPack'] = $hash;
		} else {
			$query_params['actionPack'] = $hash;
		}

		// Rebuild the URL.
		$new_query = http_build_query( $query_params );
		$base_url = $parsed_url['scheme'] . '://' . $parsed_url['host'];
		
		if ( isset( $parsed_url['port'] ) ) {
			$base_url .= ':' . $parsed_url['port'];
		}
		
		if ( isset( $parsed_url['path'] ) ) {
			$base_url .= $parsed_url['path'];
		}
		
		$base_url .= '?' . $new_query;
		
		if ( isset( $parsed_url['fragment'] ) ) {
			$base_url .= '#' . $parsed_url['fragment'];
		}

		return $base_url;
	}

}
