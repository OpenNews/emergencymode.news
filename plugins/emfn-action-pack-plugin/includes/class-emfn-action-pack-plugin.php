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
     * Cached Action Pack category order for the current request.
     *
     * @var array<int, string>|null
     */
    private $action_pack_category_order = null;

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
        add_action( 'wp_footer', array( $this, 'render_action_pack_debug_script' ), 99 );
    }

    /**
     * Enqueue front-end CSS and JS, as well as localizing the Action Pack 
     * data URL and payload prefix for use in client-side JS
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
        // stop if no payload is present in the request or if it has an unexpected format
        $payload = filter_input( INPUT_GET, 'actionPack', FILTER_UNSAFE_RAW );
        if ( ! is_string( $payload ) ) {
            return null;
        }

        // normalize and strip payload 
        $payload = trim( wp_unslash( $payload ) );

        return '' !== $payload ? $payload : null;
    }

    /**
     * Decode the current request's Action Pack payload into category names.
     *
     * @return array<int, string>|null
     */
    public function get_action_pack_values_from_request() {
        // return cached values if we've already decoded them for this request
        if ( is_array( $this->action_pack_values ) ) {
            return $this->action_pack_values;
        }

        // get the raw payload from the request; stop if missing or has unexpected format/prefix
        $payload = $this->get_action_pack_payload_from_request();
        if ( null === $payload || 0 !== strpos( $payload, self::ACTION_PACK_PAYLOAD_PREFIX ) ) {
            return null;
        }

        // decode the payload into category names and cache the result for this request
        $this->action_pack_values = $this->decode_action_pack_bitmask_payload( $payload );

        return $this->action_pack_values;
    }

    /**
     * Resolve all unique category names for the current request's Action Pack.
     *
     * @return array<int, string>
     */
    public function get_action_pack_category_names_from_request() {
        // return cached names if we've already resolved them for this request
        if ( is_array( $this->action_pack_category_names ) ) {
            return $this->action_pack_category_names;
        }

        // get the category names directly from the decoded Action Pack values
        $values = $this->get_action_pack_values_from_request();
        if ( null === $values ) {
            $this->action_pack_category_names = array();
            return $this->action_pack_category_names;
        }

        // filter out any invalid or duplicate names and cache the result for this request
        $this->action_pack_category_names = $values;

        return $this->action_pack_category_names;
    }

    /**
     * Resolve all unique category IDs for the current request's Action Pack.
     *
     * @return array<int, int>
     */
    public function get_action_pack_category_ids_from_request() {
        // return cached IDs if we've already resolved them for this request
        if ( is_array( $this->action_pack_category_ids ) ) {
            return $this->action_pack_category_ids;
        }

        // get the category names from the decoded Action Pack values, then look up their term IDs
        $category_names = $this->get_action_pack_category_names_from_request();
        $category_ids   = array();

        // get_term_by() is not especially cheap and an Action Pack can match many categories
        // cache the resolved IDs for the request so this lookup path only runs once per load
        foreach ( $category_names as $category_name ) {
            $term = get_term_by( 'name', $category_name, 'category' );

            if ( $term && ! is_wp_error( $term ) ) {
                $category_ids[] = (int) $term->term_id;
            }
        }

        // filter out any invalid or duplicate IDs and cache the result for this request
        $this->action_pack_category_ids = array_values( array_unique( array_filter( $category_ids ) ) );

        return $this->action_pack_category_ids;
    }

    /**
     * Apply Action Pack category constraints to the targeted Query Loop block
     *
     * @param array<string, mixed> $query Query Loop vars.
     * @param WP_Block            $block Parsed block instance.
     * @param int                 $page Current query loop page.
     * @return array<string, mixed>
     */
    public function filter_action_pack_query_loop_vars( $query, $block, $page ) {
        unset( $page );

        // only apply Action Pack constraints to blocks that have the correct class 
        // and a valid payload in the request
        if ( empty( $block->parsed_block['attrs']['className'] ) ) {
            return $query;
        }

        // find our class within block's className attribute
        $class_name = (string) $block->parsed_block['attrs']['className'];
        if ( false === strpos( $class_name, 'emfn-action-pack' ) ) {
            return $query;
        }

        // bail if no valid Action Pack categories could be resolved from the request payload
        $category_ids = $this->get_action_pack_category_ids_from_request();
        if ( empty( $category_ids ) ) {
            return $query;
        }

        // constrain the block's query to just of the desired categories
        $query['category__in'] = $category_ids;

        return $query;
    }

    /**
     * Load the Action Pack category order from the tall category CSV.
     *
     * @return array{category_order: array<int, string>}
     */
    public function load_tall_category_csv() {
        $csv_path = EMFN_ACTION_PACK_PLUGIN_DIR . 'assets/data/_tallCategories.csv';

        if ( ! file_exists( $csv_path ) || ! is_readable( $csv_path ) ) {
            return array(
                'category_order' => array(),
            );
        }

        $handle = fopen( $csv_path, 'r' );
        if ( false === $handle ) {
            return array(
                'category_order' => array(),
            );
        }

        $header = fgetcsv( $handle );
        if ( ! is_array( $header ) ) {
            fclose( $handle );
            return array(
                'category_order' => array(),
            );
        }

        // lowercase header values for more robust column index lookup
        $normalized_header = array_map(
            static function ( $value ) {
                return trim( strtolower( (string) $value ) );
            },
            $header
        );

        $answer_id_index   = array_search( 'answerid', $normalized_header, true );
        $category_index    = array_search( 'category', $normalized_header, true );
        $manual_rank_index = array_search( 'manualrank', $normalized_header, true );

        if ( false === $answer_id_index || false === $category_index || false === $manual_rank_index ) {
            fclose( $handle );
            return array(
                'category_order' => array(),
            );
        }

        $category_ranks     = array();
        $category_positions = array();
        $category_order     = array();

        // read through the CSV and build a list of unique categories with their max manual rank
        while ( false !== ( $row = fgetcsv( $handle ) ) ) {
            $entry_id = isset( $row[ $answer_id_index ] ) ? trim( (string) $row[ $answer_id_index ] ) : '';
            $category = isset( $row[ $category_index ] ) ? trim( (string) $row[ $category_index ] ) : '';
            $manual_rank = isset( $row[ $manual_rank_index ] )
                ? (int) trim( (string) $row[ $manual_rank_index ] )
                : 0;

            if ( '' === $entry_id || '' === $category ) {
                continue;
            }

            if ( ! array_key_exists( $category, $category_ranks ) ) {
                $category_positions[ $category ] = count( $category_order );
                $category_order[]                = $category;
                $category_ranks[ $category ]     = $manual_rank;
            } else {
                $category_ranks[ $category ] = max( $category_ranks[ $category ], $manual_rank );
            }

            unset( $entry_id );
        }

        fclose( $handle );

        // sort the categories by manualRank desc
        usort(
            $category_order,
            static function ( $left, $right ) use ( $category_ranks, $category_positions ) {
                $left_rank      = $category_ranks[ $left ] ?? 0;
                $right_rank     = $category_ranks[ $right ] ?? 0;
                $left_position  = $category_positions[ $left ] ?? 0;
                $right_position = $category_positions[ $right ] ?? 0;

                if ( $left_rank !== $right_rank ) {
                    return $right_rank <=> $left_rank;
                }

                return $left_position <=> $right_position;
            }
        );

        return array(
            'category_order' => $category_order,
        );
    }

    /**
     * Decode the compact bitmask/base36 Action Pack payload format.
     *
     * @param string $payload Action Pack payload after the prefix
     * @return array<int, string>|null
     */
    private function decode_action_pack_bitmask_payload( $payload ) {
        // strip the format prefix so only the encoded bitmask segments remain
        $encoded_payload = substr( $payload, strlen( self::ACTION_PACK_PAYLOAD_PREFIX ) );

        // stop if post-prefix payload is not a valid Action Pack selection
        if ( '' === $encoded_payload ) {
            return null;
        }

        // load the category order once so PHP uses the same bit positions as JS
        if ( ! is_array( $this->action_pack_category_order ) ) {
            $loaded_registry                  = $this->load_tall_category_csv();
            $this->action_pack_category_order = $loaded_registry['category_order'];
        }

        // stop if we don't have a valid category order to decode against
        $category_order = $this->action_pack_category_order;
        if ( empty( $category_order ) ) {
            return null;
        }

        // each dot-separated chunk is one base36-encoded 31-bit segment
        $resolved_categories = array();
        $segments            = explode( '.', $encoded_payload );

        // walk through each segment and decode it back into category names based
        foreach ( $segments as $segment_index => $segment ) {
            // normalize user input before validating or decoding it
            $normalized_segment = trim( (string) $segment );

            // only lowercase base36 characters are expected in the compact format
            if ( '' === $normalized_segment || ! preg_match( '/^[0-9a-z]+$/', $normalized_segment ) ) {
                return null;
            }

            // convert the compact base36 string back to an integer bitmask
            $segment_value = (int) base_convert( $normalized_segment, 36, 10 );
            if ( $segment_value < 0 ) {
                return null;
            }

            // walk through the 31 available bit positions for this segment
            // each set bit maps to one category index in the shared order
            for ( $bit_index = 0; $bit_index < self::ACTION_PACK_SEGMENT_SIZE; $bit_index++ ) {
                $mask           = 1 << $bit_index;
                $category_index = ( $segment_index * self::ACTION_PACK_SEGMENT_SIZE ) + $bit_index;

                // skip bits that are off and skip indexes beyond the known category list
                if ( 0 === ( $segment_value & $mask ) || ! isset( $category_order[ $category_index ] ) ) {
                    continue;
                }

                // append the category name that lives at this bit position
                $resolved_categories[] = $category_order[ $category_index ];
            }
        }

        // return null when nothing valid was decoded so callers can bail cleanly
        return ! empty( $resolved_categories ) ? $resolved_categories : null;
    }

    /**
     * Output decoded Action Pack categories to the browser console for debugging.
     *
     * @return void
     */
    public function render_action_pack_debug_script() {
        // only output debug info if we have a valid Action Pack payload in the request
        if ( null === $this->get_action_pack_payload_from_request() ) {
            return;
        }

        // output resolved category names for the current request to dev tools for debugging
        $category_names = $this->get_action_pack_category_names_from_request();
        if ( ! is_array( $category_names ) ) {
            return;
        }

        printf(
            '<script>console.debug("EMFN Action Pack decoded categories:", %s);</script>',
            wp_json_encode( array_values( $category_names ) )
        );
    }

}