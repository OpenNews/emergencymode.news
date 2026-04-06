<?php
/**
 * Main plugin class for EMFN Action Pack Plugin.
 *
 * @package EMFN_Action_Pack_Plugin
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

/**
 * Class EMFN_Action_Pack_Plugin
 *
 * Singleton that wires up all hooks for the plugin.
 */
class EMFN_Action_Pack_Plugin {

    /**
     * Compact bitmask/base36 Action Pack prefix.
     *
     * @var string
     */
    private const ACTION_PACK_PAYLOAD_PREFIX = 'ap2.';

    /**
     * Legacy JSON/base64 Action Pack prefix.
     *
     * @var string
     */
    private const ACTION_PACK_LEGACY_PAYLOAD_PREFIX = 'ap1.';

    /**
     * Maximum bits stored in each base36 Action Pack segment.
     *
     * @var int
     */
    private const ACTION_PACK_SEGMENT_SIZE = 31;

    /**
     * Single instance of this class.
     *
     * @var self|null
     */
    private static $instance = null;

    /**
     * Cached decoded Action Pack values for the current request.
     *
     * @var array<int, string>|null
     */
    private $action_pack_values = null;

    /**
     * Cached keyed Action Pack values for the current request.
     *
     * @var array<string, string|array<int, string>>|null
     */
    private $action_pack_value_map = null;

    /**
     * Cached tall category lookup for the current request.
     *
     * @var array<string, array<int, string>>|null
     */
    private $tall_category_map = null;

    /**
     * Cached Action Pack token order for the current request.
     *
     * @var array<int, string>|null
     */
    private $action_pack_token_order = null;

    /**
     * Cached resolved category names for the current request.
     *
     * @var array<int, string>|null
     */
    private $action_pack_category_names = null;

    /**
     * Cached resolved category IDs for the current request.
     *
     * @var array<int, int>|null
     */
    private $action_pack_category_ids = null;

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
        add_filter( 'query_loop_block_query_vars', array( $this, 'filter_action_pack_query_loop_vars' ), 10, 3 );
    }

    /**
     * Enqueue front-end CSS and JS.
     */
    public function enqueue_assets() {
        wp_enqueue_style(
            'emfn-action-pack-plugin',
            EMFN_ACTION_PACK_PLUGIN_URL . 'assets/css/emfn-action-pack-plugin.css',
            array(),
            EMFN_ACTION_PACK_PLUGIN_VERSION
        );

        wp_enqueue_script(
            'emfn-action-pack-plugin',
            EMFN_ACTION_PACK_PLUGIN_URL . 'assets/js/emfn-action-pack-plugin.js',
            array(),
            EMFN_ACTION_PACK_PLUGIN_VERSION,
            true
        );

        wp_localize_script(
            'emfn-action-pack-plugin',
            'emfnData',
            array(
                'dataUrl'                 => EMFN_ACTION_PACK_PLUGIN_URL . 'assets/data',
                'actionPackPayloadPrefix' => self::ACTION_PACK_PAYLOAD_PREFIX,
            )
        );
    }

    /**
     * Return the raw Action Pack payload from the request, if present.
     *
     * @return string|null
     */
    public function get_action_pack_payload_from_request() {
        $payload = filter_input( INPUT_GET, 'actionPack', FILTER_UNSAFE_RAW );
        if ( ! is_string( $payload ) ) {
            return null;
        }

        $payload = trim( wp_unslash( $payload ) );

        return '' !== $payload ? $payload : null;
    }

    /**
     * Decode the current request's Action Pack payload into ordered values.
     *
     * @return array<int, string>|null
     */
    public function get_action_pack_values_from_request() {
        if ( is_array( $this->action_pack_values ) ) {
            return $this->action_pack_values;
        }

        $payload = $this->get_action_pack_payload_from_request();
        if ( null === $payload ) {
            return null;
        }

        $this->action_pack_values = $this->decode_action_pack_payload( $payload );

        return $this->action_pack_values;
    }

    /**
     * Decode the current request's Action Pack payload into a keyed semantic map.
     *
     * @return array<string, string|array<int, string>>|null
     */
    public function get_action_pack_value_map_from_request() {
        if ( is_array( $this->action_pack_value_map ) ) {
            return $this->action_pack_value_map;
        }

        $values = $this->get_action_pack_values_from_request();
        if ( null === $values ) {
            return null;
        }

        $this->action_pack_value_map = $this->map_action_pack_values_by_key( $values );

        return $this->action_pack_value_map;
    }

    /**
     * Decode any supported Action Pack payload into its original ordered values.
     *
     * @param string $payload Action Pack payload from the request.
     * @return array<int, string>|null
     */
    public function decode_action_pack_payload( $payload ) {
        if ( ! is_string( $payload ) || '' === $payload ) {
            return null;
        }

        if ( 0 === strpos( $payload, self::ACTION_PACK_PAYLOAD_PREFIX ) ) {
            return $this->decode_action_pack_bitmask_payload( $payload );
        }

        if ( 0 === strpos( $payload, self::ACTION_PACK_LEGACY_PAYLOAD_PREFIX ) ) {
            return $this->decode_action_pack_legacy_payload( $payload );
        }

        return null;
    }

    /**
     * Convert decoded Action Pack values into an associative semantic map.
     *
     * @param array<int, string> $values Ordered payload values.
     * @return array<string, string|array<int, string>>
     */
    public function map_action_pack_values_by_key( $values ) {
        $mapped_values = array();

        foreach ( $values as $token ) {
            if ( ! is_string( $token ) || false === strpos( $token, '-' ) ) {
                continue;
            }

            list( $key, $value ) = explode( '-', $token, 2 );

            $key   = trim( $key );
            $value = trim( $value );

            if ( '' === $key || '' === $value ) {
                continue;
            }

            if ( ! array_key_exists( $key, $mapped_values ) ) {
                $mapped_values[ $key ] = $value;
                continue;
            }

            if ( ! is_array( $mapped_values[ $key ] ) ) {
                $mapped_values[ $key ] = array( (string) $mapped_values[ $key ] );
            }

            $mapped_values[ $key ][] = $value;
        }

        return $mapped_values;
    }

    /**
     * Resolve all unique category names for the current request's Action Pack.
     *
     * @return array<int, string>
     */
    public function get_action_pack_category_names_from_request() {
        if ( is_array( $this->action_pack_category_names ) ) {
            return $this->action_pack_category_names;
        }

        $values = $this->get_action_pack_values_from_request();
        if ( null === $values ) {
            $this->action_pack_category_names = array();
            return $this->action_pack_category_names;
        }

        $this->action_pack_category_names = $this->resolve_categories_from_tokens( $values );

        return $this->action_pack_category_names;
    }

    /**
     * Resolve all unique category IDs for the current request's Action Pack.
     *
     * @return array<int, int>
     */
    public function get_action_pack_category_ids_from_request() {
        if ( is_array( $this->action_pack_category_ids ) ) {
            return $this->action_pack_category_ids;
        }

        $category_names = $this->get_action_pack_category_names_from_request();
        $category_ids   = array();

        foreach ( $category_names as $category_name ) {
            $term = get_term_by( 'name', $category_name, 'category' );

            if ( $term && ! is_wp_error( $term ) ) {
                $category_ids[] = (int) $term->term_id;
            }
        }

        $this->action_pack_category_ids = array_values( array_unique( array_filter( $category_ids ) ) );

        return $this->action_pack_category_ids;
    }

    /**
     * Apply Action Pack category constraints to the targeted Query Loop block.
     *
     * @param array<string, mixed> $query Query Loop vars.
     * @param WP_Block            $block Parsed block instance.
     * @param int                 $page Current query loop page.
     * @return array<string, mixed>
     */
    public function filter_action_pack_query_loop_vars( $query, $block, $page ) {
        unset( $page );

        if ( empty( $block->parsed_block['attrs']['className'] ) ) {
            return $query;
        }

        $class_name = (string) $block->parsed_block['attrs']['className'];
        if ( false === strpos( $class_name, 'emfn-action-pack' ) ) {
            return $query;
        }

        $category_ids = $this->get_action_pack_category_ids_from_request();
        if ( empty( $category_ids ) ) {
            return $query;
        }

        $query['category__in'] = $category_ids;

        return $query;
    }

    /**
     * Resolve unique category names from a list of semantic tokens.
     *
     * @param array<int, string> $tokens Action Pack semantic tokens.
     * @return array<int, string>
     */
    public function resolve_categories_from_tokens( $tokens ) {
        $category_map   = $this->get_tall_category_map();
        $resolved_names = array();

        foreach ( $tokens as $token ) {
            if ( empty( $category_map[ $token ] ) ) {
                continue;
            }

            foreach ( $category_map[ $token ] as $category_name ) {
                $normalized_name = trim( $category_name );

                if ( '' !== $normalized_name ) {
                    $resolved_names[] = $normalized_name;
                }
            }
        }

        return array_values( array_unique( $resolved_names ) );
    }

    /**
     * Return the tall category lookup map for the current request.
     *
     * @return array<string, array<int, string>>
     */
    public function get_tall_category_map() {
        $this->ensure_action_pack_registry_loaded();
        return $this->tall_category_map;
    }

    /**
     * Return the Action Pack token order used by the compact bitmask format.
     *
     * @return array<int, string>
     */
    public function get_action_pack_token_order() {
        $this->ensure_action_pack_registry_loaded();

        return $this->action_pack_token_order;
    }

     /**
      * Load the tall category CSV from repeated `entry_id,category` rows.
      *
      * Repeated `entry_id` rows are collapsed into `entry_id => [category, ...]`.
      *
      * @return array{category_map: array<string, array<int, string>>, token_order: array<int, string>}
      */
    public function load_tall_category_csv() {
        $csv_path = EMFN_ACTION_PACK_PLUGIN_DIR . 'assets/data/_tallCategories.csv';

        if ( ! file_exists( $csv_path ) || ! is_readable( $csv_path ) ) {
            return array(
                'category_map' => array(),
                'token_order'  => array(),
            );
        }

        $handle = fopen( $csv_path, 'r' );
        if ( false === $handle ) {
            return array(
                'category_map' => array(),
                'token_order'  => array(),
            );
        }

        $header = fgetcsv( $handle );
        if (
            ! is_array( $header )
            || empty( $header[0] )
            || empty( $header[1] )
            || 'entry_id' !== trim( (string) $header[0] )
            || 'category' !== trim( (string) $header[1] )
        ) {
            fclose( $handle );
            return array(
                'category_map' => array(),
                'token_order'  => array(),
            );
        }

        $category_map = array();
        $token_order  = array();

        while ( false !== ( $row = fgetcsv( $handle ) ) ) {
            $entry_id = isset( $row[0] ) ? trim( (string) $row[0] ) : '';

            if ( '' === $entry_id ) {
                continue;
            }

            if ( ! in_array( $entry_id, $token_order, true ) ) {
                $token_order[] = $entry_id;
            }

            if ( ! isset( $category_map[ $entry_id ] ) ) {
                $category_map[ $entry_id ] = array();
            }

            foreach ( array_slice( $row, 1 ) as $category ) {
                $normalized_category = trim( (string) $category );

                if ( '' === $normalized_category ) {
                    continue;
                }

                if ( ! in_array( $normalized_category, $category_map[ $entry_id ], true ) ) {
                    $category_map[ $entry_id ][] = $normalized_category;
                }
            }
        }

        fclose( $handle );

        return array(
            'category_map' => $category_map,
            'token_order'  => $token_order,
        );
    }

    /**
     * Decode the compact bitmask/base36 Action Pack payload format.
     *
     * @param string $payload Action Pack payload beginning with `ap2.`.
     * @return array<int, string>|null
     */
    private function decode_action_pack_bitmask_payload( $payload ) {
        $encoded_payload = substr( $payload, strlen( self::ACTION_PACK_PAYLOAD_PREFIX ) );

        if ( '' === $encoded_payload ) {
            return null;
        }

        $token_order = $this->get_action_pack_token_order();
        if ( empty( $token_order ) ) {
            return null;
        }

        $resolved_values = array();
        $segments        = explode( '.', $encoded_payload );

        foreach ( $segments as $segment_index => $segment ) {
            $normalized_segment = trim( (string) $segment );

            if ( '' === $normalized_segment || ! preg_match( '/^[0-9a-z]+$/', $normalized_segment ) ) {
                return null;
            }

            $segment_value = (int) base_convert( $normalized_segment, 36, 10 );
            if ( $segment_value < 0 ) {
                return null;
            }

            for ( $bit_index = 0; $bit_index < self::ACTION_PACK_SEGMENT_SIZE; $bit_index++ ) {
                $mask        = 1 << $bit_index;
                $token_index = ( $segment_index * self::ACTION_PACK_SEGMENT_SIZE ) + $bit_index;

                if ( 0 === ( $segment_value & $mask ) || ! isset( $token_order[ $token_index ] ) ) {
                    continue;
                }

                $resolved_values[] = $token_order[ $token_index ];
            }
        }

        return ! empty( $resolved_values ) ? $resolved_values : null;
    }

    /**
     * Ensure the CSV-driven Action Pack token registry is loaded.
     *
     * @return void
     */
    private function ensure_action_pack_registry_loaded() {
        if ( is_array( $this->tall_category_map ) && is_array( $this->action_pack_token_order ) ) {
            return;
        }

        $loaded_registry               = $this->load_tall_category_csv();
        $this->tall_category_map       = $loaded_registry['category_map'];
        $this->action_pack_token_order = $loaded_registry['token_order'];
    }

    /**
     * Decode the legacy JSON/base64 Action Pack payload format.
     *
     * @param string $payload Action Pack payload beginning with `ap1.`.
     * @return array<int, string>|null
     */
    private function decode_action_pack_legacy_payload( $payload ) {
        $encoded_payload = substr( $payload, strlen( self::ACTION_PACK_LEGACY_PAYLOAD_PREFIX ) );

        if ( '' === $encoded_payload ) {
            return null;
        }

        $decoded_json = $this->decode_action_pack_base64url( $encoded_payload );
        if ( null === $decoded_json ) {
            return null;
        }

        $decoded_payload = json_decode( $decoded_json, true );
        if ( JSON_ERROR_NONE !== json_last_error() || ! is_array( $decoded_payload ) ) {
            return null;
        }

        if ( empty( $decoded_payload['v'] ) || 1 !== (int) $decoded_payload['v'] ) {
            return null;
        }

        if ( ! empty( $decoded_payload['values'] ) && is_array( $decoded_payload['values'] ) ) {
            $values = array();

            foreach ( $decoded_payload['values'] as $value ) {
                $normalized_value = trim( (string) $value );

                if ( '' === $normalized_value || false === strpos( $normalized_value, '-' ) ) {
                    continue;
                }

                $values[] = $normalized_value;
            }

            return ! empty( $values ) ? $values : null;
        }

        if ( empty( $decoded_payload['entries'] ) || ! is_array( $decoded_payload['entries'] ) ) {
            return null;
        }

        $values = array();

        foreach ( $decoded_payload['entries'] as $entry ) {
            if ( ! is_array( $entry ) || 2 !== count( $entry ) ) {
                continue;
            }

            $value = isset( $entry[1] ) ? trim( (string) $entry[1] ) : '';

            if ( '' === $value || false === strpos( $value, '-' ) ) {
                continue;
            }

            $values[] = $value;
        }

        return ! empty( $values ) ? $values : null;
    }

    /**
     * Decode URL-safe base64 text.
     *
     * @param string $value Base64url-encoded string.
     * @return string|null
     */
    private function decode_action_pack_base64url( $value ) {
        $normalized = strtr( $value, '-_', '+/' );
        $padding    = strlen( $normalized ) % 4;

        if ( 0 !== $padding ) {
            $normalized .= str_repeat( '=', 4 - $padding );
        }

        $decoded = base64_decode( $normalized, true );

        return false !== $decoded ? $decoded : null;
    }
}