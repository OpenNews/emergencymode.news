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
		// Pre-submission hook to process quiz data and generate hash.
		add_action( 'gform_pre_submission', array( $this, 'process_quiz_data' ), 10, 1 );

		// Confirmation hook to modify the confirmation URL with action pack hash.
		add_filter( 'gform_confirmation', array( $this, 'modify_confirmation_url' ), 10, 4 );

		// Submission started hook to preserve actionPack parameter.
		add_action( 'gform_submission_started', array( $this, 'preserve_action_pack' ), 10, 2 );
	}

	/**
	 * Process quiz data before form submission.
	 *
	 * Extracts quiz field values, generates a hash, and maps to categories.
	 *
	 * @param array $form The Gravity Forms form object.
	 */
	public function process_quiz_data( $form ) {
		// Extract quiz data from form submission.
		$quiz_data = $this->extract_quiz_data();

		// Generate hash from quiz data.
		$hash = $this->generate_hash( $quiz_data );

		// Load quiz map and augment with category mapping.
		$category_mapping = $this->map_to_categories( $quiz_data );

		// Store hash and mapping in transient for use in confirmation.
		set_transient( 'emfn_action_pack_' . $form['id'], array(
			'hash'       => $hash,
			'quiz_data'  => $quiz_data,
			'categories' => $category_mapping,
		), HOUR_IN_SECONDS );
	}

	/**
	 * Extract quiz data from the current form submission.
	 *
	 * @return array Quiz data with keys: mode, size, offlineResiliency, pubSituation, disInfo.
	 */
	private function extract_quiz_data() {
		$quiz_data = array(
			'mode'              => isset( $_POST['input_mode'] ) ? sanitize_text_field( wp_unslash( $_POST['input_mode'] ) ) : null,
			'size'              => isset( $_POST['input_size'] ) ? sanitize_text_field( wp_unslash( $_POST['input_size'] ) ) : null,
			'offlineResiliency' => isset( $_POST['input_offline_resiliency'] ) ? sanitize_text_field( wp_unslash( $_POST['input_offline_resiliency'] ) ) : null,
			'pubSituation'      => isset( $_POST['input_pub_situation'] ) ? sanitize_text_field( wp_unslash( $_POST['input_pub_situation'] ) ) : null,
			'disInfo'           => isset( $_POST['input_dis_info'] ) ? sanitize_text_field( wp_unslash( $_POST['input_dis_info'] ) ) : null,
		);

		// Filter out null values.
		return array_filter( $quiz_data, function( $value ) {
			return ! is_null( $value ) && '' !== $value;
		});
	}

	/**
	 * Generate a human-friendly short hash from quiz data.
	 *
	 * Uses base36 encoding for a compact, URL-friendly hash.
	 *
	 * @param array $quiz_data The quiz data to hash.
	 * @return string The generated hash.
	 */
	private function generate_hash( $quiz_data ) {
		// Create a consistent string representation of the quiz data.
		$data_string = '';
		
		// Sort keys for consistency.
		ksort( $quiz_data );
		
		foreach ( $quiz_data as $key => $value ) {
			$data_string .= $key . ':' . $value . '|';
		}

		// Generate a CRC32 hash and convert to base36 for compactness.
		$numeric_hash = crc32( $data_string );
		
		// Ensure positive value for base conversion.
		if ( $numeric_hash < 0 ) {
			$numeric_hash = $numeric_hash + 4294967296; // 2^32.
		}
		
		// Convert to base36 (0-9, a-z) for a short, human-friendly hash.
		$hash = base_convert( (string) $numeric_hash, 10, 36 );
		
		return strtolower( $hash );
	}

	/**
	 * Map quiz answers to WordPress categories using quizMap.csv.
	 *
	 * @param array $quiz_data The quiz data to map.
	 * @return array Array of category slugs.
	 */
	private function map_to_categories( $quiz_data ) {
		$categories = array();
		
		// Load the quiz map CSV.
		$csv_path = EMFN_BEHAVIOR_PLUGIN_DIR . 'assets/data/quizMap.csv';
		
		if ( ! file_exists( $csv_path ) ) {
			return $categories;
		}

		// Parse CSV file.
		$csv_data = array();
		// phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents
		$csv_content = file_get_contents( $csv_path );
		$lines = str_getcsv( $csv_content, "\n" );
		
		// Skip header row.
		$header = array_shift( $lines );
		
		foreach ( $lines as $line ) {
			if ( empty( trim( $line ) ) ) {
				continue;
			}
			
			$row = str_getcsv( $line );
			if ( count( $row ) >= 3 ) {
				$csv_data[] = array(
					'slug'   => $row[0],
					'answer' => $row[1],
					'mode'   => $row[2],
				);
			}
		}

		// Loop through quiz data and match against CSV.
		foreach ( $quiz_data as $key => $value ) {
			foreach ( $csv_data as $mapping ) {
				// Match on answer value.
				if ( (string) $mapping['answer'] === (string) $value ) {
					// If mode column is not empty, also check mode match.
					if ( ! empty( $mapping['mode'] ) && isset( $quiz_data['mode'] ) ) {
						if ( $mapping['mode'] === $quiz_data['mode'] ) {
							$categories[] = $mapping['slug'];
						}
					} else {
						$categories[] = $mapping['slug'];
					}
				}
			}
		}

		return array_unique( $categories );
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

	/**
	 * Preserve actionPack parameter when form submission starts.
	 *
	 * @param array $form The Gravity Forms form object.
	 * @param array $entry The form entry being created.
	 */
	public function preserve_action_pack( $form, $entry ) {
		// Check if actionPack parameter exists in the request.
		if ( isset( $_GET['actionPack'] ) ) {
			$action_pack = sanitize_text_field( wp_unslash( $_GET['actionPack'] ) );
			
			// Store in session or transient for later retrieval.
			set_transient( 'emfn_preserved_action_pack_' . $form['id'], $action_pack, HOUR_IN_SECONDS );
		}
	}
}
