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
     * Cached WordPress term IDs decoded from Action Pack payload for the current request.
     *
     * @var array<int, int>|null
     */
    private $action_pack_term_ids = null;

    /**
     * Cached Action Pack category ID order from CSV (for decoding bit positions).
     *
     * @var array<int, int>|null
     */
    private $action_pack_category_order = null;

    /**
     * Cached category scoring data (weights and scarcity multipliers) for the current request.
     *
     * @var array{weights: array<int, int>, scarcity: array<int, float>, score_sql: string}|null
     */
    private $action_pack_scoring_cache = null;

    /**
     * Buffered debug entries to emit to the browser console in the footer.
     *
     * @var array<int, array{label: string, value: mixed}>
     */
    private $action_pack_debug_entries = array();

    /**
     * Cached flag for whether the current request targets the Action Pack page.
     *
     * @var bool|null
     */
    private $is_action_pack_page_request = null;

    /**
     * Cached resolved Newspack block names for filtering.
     *
     * @var array<int, string>|null
     */
    private $newspack_block_names = null;

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
        add_filter( 'render_block_data', array( $this, 'filter_action_pack_newspack_block_data' ), 10, 3 );
        add_action( 'pre_get_posts', array( $this, 'mark_action_pack_newspack_queries' ) );
        add_filter( 'posts_clauses', array( $this, 'apply_action_pack_category_scoring' ), 10, 2 );
        add_filter( 'editable_extensions', array( $this, 'allow_viewable_file_extensions' ), 10, 2 );
        add_action( 'admin_head-plugin-editor.php', array( $this, 'make_md_files_readonly' ) );
        add_action( 'wp_footer', array( $this, 'render_action_pack_debug_script' ), 99 );
    }

    /**
     * Allow CSV and Markdown files to appear in the Plugin File Editor (read-only).
     *
     * @param array<int, string> $extensions Viewable file extensions.
     * @param string             $context    Editor context: 'plugins' or 'themes'.
     * @return array<int, string>
     */
    public function allow_viewable_file_extensions( $extensions, $context ) {
        if ( 'plugins' !== $context ) {
            return $extensions;
        }

        $allowed_extensions = array( 'csv', 'md' );
        foreach ( $allowed_extensions as $ext ) {
            if ( ! in_array( $ext, $extensions, true ) ) {
                $extensions[] = $ext;
            }
        }

        return $extensions;
    }

    /**
     * Prevent direct editing of Markdown data files.
     *
     * Blocks access to this plugin's data files via the WordPress file editor
     * using server-side enforcement that cannot be bypassed by disabling JavaScript.
     *
     * @return void
     */
    public function make_md_files_readonly() {
        global $file;

        if ( ! isset( $file ) ) {
            return;
        }

        // Only protect THIS plugin's data files, not global file editor
        if ( false === strpos( $file, 'emfn-action-pack-plugin/assets/data' ) ) {
            return;
        }

        // Block attempts to edit data files
        if ( preg_match( '/\.(md)$/', $file ) ) {
            wp_die(
                esc_html__( 'Markdown should be maintained in GitHub.', 'emfn-action-pack-plugin' ),
                esc_html__( 'File Protected', 'emfn-action-pack-plugin' ),
                array( 'response' => 403 )
            );
        }
    }

    /**
     * Enqueue front-end CSS and JS, as well as localizing the Action Pack
     * data URL and payload prefix for use in client-side JS
     */
    public function enqueue_assets() {
        if ( ! $this->is_action_pack_page_request() ) {
            return;
        }

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
     * Return whether this frontend request targets the Action Pack page.
     *
     * Presence of either recognised querystring parameter is the sole signal:
     * - `actionPack` → results page
     * - `mode`       → quiz / form page (e.g. ?mode=mode-before)
     *
     * @return bool
     */
    private function is_action_pack_page_request() {
        if ( is_bool( $this->is_action_pack_page_request ) ) {
            return $this->is_action_pack_page_request;
        }

        if ( is_admin() ) {
            $this->is_action_pack_page_request = false;
            return $this->is_action_pack_page_request;
        }

        $has_action_pack_param = null !== $this->get_action_pack_payload_from_request();
        $has_mode_param        = isset( $_GET['mode'] ) && '' !== $_GET['mode'];

        $this->is_action_pack_page_request = $has_action_pack_param || $has_mode_param;

        return $this->is_action_pack_page_request;
    }

    /**
     * Queue a PHP-side debug payload for later output in the browser console.
     *
     * @param string $label Debug label.
     * @param mixed  $value Debug payload.
     * @return void
     */
    private function queue_action_pack_debug_entry( $label, $value ) {
        $normalized_label = trim( (string) $label );
        if ( 0 !== strpos( $normalized_label, 'EMFN:' ) ) {
            $normalized_label = 'EMFN: ' . $normalized_label;
        }

        $this->action_pack_debug_entries[] = array(
            'label' => $normalized_label,
            'value' => $value,
        );
    }

    /**
     * Ensure PHP-side Action Pack debug entries are populated for this request.
     *
     * @return void
     */
    private function prime_action_pack_debug_entries() {
        $payload  = $this->get_action_pack_payload_from_request();
        $term_ids = $this->get_action_pack_term_ids_from_request();

        // Always prepend the base entry so it appears first in console output,
        // regardless of whether block-render filters already queued their own entries.
        array_unshift(
            $this->action_pack_debug_entries,
            array(
                'label' => 'EMFN: Action Pack payload decoded',
                'value' => array(
                    'payload' => $payload,
                    'termIds' => $term_ids,
                ),
            )
        );
    }

    /**
     * Return whether Action Pack debug output is enabled for the current request.
     *
     * Debug output is restricted to WordPress administrators and editors only.
     *
     * @return bool
     */
    private function is_action_pack_debug_enabled() {
        $debug_flag = isset( $_GET['emfnDebug'] ) ? strtolower( trim( wp_unslash( (string) $_GET['emfnDebug'] ) ) ) : '';

        return 'true' === $debug_flag && ( current_user_can( 'manage_options' ) || current_user_can( 'edit_pages' ) );
    }

    /**
     * Output queued PHP-side debug payloads to the browser console.
     *
     * @return void
     */
    public function render_action_pack_debug_script() {
        if ( ! $this->is_action_pack_page_request() ) {
            return;
        }

        if ( ! $this->is_action_pack_debug_enabled() ) {
            return;
        }

        $this->prime_action_pack_debug_entries();

        if ( empty( $this->action_pack_debug_entries ) ) {
            return;
        }

        echo "<script>\n";

        /** next line helps with debugging */
        // printf("console.debug(EMFN Action Pack PHP debug v1);\n");

        foreach ( $this->action_pack_debug_entries as $entry ) {
            printf(
                "console.debug(%s, %s);\n",
                wp_json_encode( $entry['label'] ),
                wp_json_encode( $entry['value'] )
            );
        }

        echo "</script>\n";
    }

    /**
     * Return the raw Action Pack payload from the request, if present.
     *
     * @return string|null
     */
    public function get_action_pack_payload_from_request() {
        if ( ! isset( $_GET['actionPack'] ) ) {
            return null;
        }

        $payload = trim( wp_unslash( (string) $_GET['actionPack'] ) );

        return '' !== $payload ? $payload : null;
    }

    /**
     * Decode the current request's Action Pack payload into WordPress term IDs.
     *
     * @return array<int, int>|null
     */
    public function get_action_pack_term_ids_from_request() {
        if ( ! $this->is_action_pack_page_request() ) {
            return null;
        }

        if ( is_array( $this->action_pack_term_ids ) ) {
            return $this->action_pack_term_ids;
        }

        $payload = $this->get_action_pack_payload_from_request();
        if ( null === $payload || 0 !== strpos( $payload, self::ACTION_PACK_PAYLOAD_PREFIX ) ) {
            return null;
        }

        $this->action_pack_term_ids = $this->decode_action_pack_bitmask_payload( $payload );

        return $this->action_pack_term_ids;
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

        if ( ! $this->is_action_pack_page_request() ) {
            return $query;
        }

        // only apply Action Pack constraints to blocks that have the correct class
        // and a valid payload in the request
        if ( empty( $block->parsed_block['attrs']['className'] ) ) {
            $this->queue_action_pack_debug_entry( 'can\'t find correct className', $query );
            return $query;
        }

        // find our class within block's className attribute
        $class_name = (string) $block->parsed_block['attrs']['className'];
        if ( false === strpos( $class_name, 'emfn-action-pack' ) ) {
            $this->queue_action_pack_debug_entry( 'No match found for .emfn-action-pack', $class_name );
            return $query;
        }
        $this->queue_action_pack_debug_entry( 'parsed_block[\'attrs\'][\'className\']', $class_name );

        $term_ids = $this->get_action_pack_term_ids_from_request();
        if ( empty( $term_ids ) ) {
            $this->queue_action_pack_debug_entry( 'No valid Action Pack term IDs decoded', $query );
            return $query;
        }

        $query['category__in'] = $term_ids;
        $query['emfn_action_pack'] = true;

        return $query;
    }

    /**
     * Apply smart category scoring to Action Pack queries.
     * 
     * Scoring strategy:
     * - Tier tags (resources-tier-1, resources-tier-2, etc.): editorial quality
     * - Category weight (from term order): user's priority
     * - Scarcity bonus: high-weight category + few posts = rare/specific match
     * - Multi-category bonus: posts matching multiple user categories
     *
     * @param array<string, string> $clauses SQL clauses.
     * @param WP_Query              $query Query instance.
     * @return array<string, string>
     */
    public function apply_action_pack_category_scoring( $clauses, $query ) {
        global $wpdb;

        if ( ! $query->get( 'emfn_action_pack' ) ) {
            return $clauses;
        }

        $term_ids = $this->get_action_pack_term_ids_from_request();
        if ( empty( $term_ids ) ) {
            return $clauses;
        }

        // Use cached scoring data if available to avoid redundant term lookups
        if ( null === $this->action_pack_scoring_cache ) {
            // Build category weights from term order (earlier = higher weight)
            $weights = array();
            $max_weight = count( $term_ids );
            foreach ( $term_ids as $index => $term_id ) {
                $weight = $max_weight - $index;
                $weights[ $term_id ] = $weight;
            }

            // Get post counts per category for scarcity calculation
            $terms = get_terms( array(
                'taxonomy'   => 'category',
                'include'    => $term_ids,
                'hide_empty' => false,
            ) );

            $scarcity_multipliers = array();
            if ( ! is_wp_error( $terms ) && is_array( $terms ) && ! empty( $terms ) ) {
                $counts = array_map( function( $term ) {
                    return isset( $term->count ) ? (int) $term->count : 1;
                }, $terms );
                
                $max_count = ! empty( $counts ) ? max( $counts ) : 1;
                
                foreach ( $terms as $term ) {
                    if ( isset( $term->term_id ) && isset( $term->count ) ) {
                        $count = max( 1, (int) $term->count );
                        // Scarcity: fewer posts = higher multiplier (inverse proportion)
                        $scarcity_multipliers[ $term->term_id ] = $max_count / $count;
                    }
                }
            }

            // Build weighted score with scarcity bonus
            $score_cases = array();
            foreach ( $weights as $term_id => $weight ) {
                $scarcity = isset( $scarcity_multipliers[ $term_id ] ) ? $scarcity_multipliers[ $term_id ] : 1.0;
                $score = $weight * $scarcity;
                $score_cases[] = $wpdb->prepare( 'WHEN ap_cat_tt.term_id = %d THEN %f', $term_id, $score );
            }
            $score_sql = 'CASE ' . implode( ' ', $score_cases ) . ' ELSE 0 END';

            // Cache for subsequent queries in this request
            $this->action_pack_scoring_cache = array(
                'weights'   => $weights,
                'scarcity'  => $scarcity_multipliers,
                'score_sql' => $score_sql,
            );

            $this->queue_action_pack_debug_entry(
                'Action Pack scoring cache built',
                array(
                    'termIds'  => $term_ids,
                    'weights'  => $weights,
                    'scarcity' => $scarcity_multipliers,
                )
            );
        }

        $score_sql = $this->action_pack_scoring_cache['score_sql'];

        // Tier-based scoring 
        // (resources-tier-1 = best, resources-tier-2 = good, resources-tier-3 = acceptable, etc.)
        // Posts without tier Tags get score of 1 (lowest priority)
        // Aggregate tier data in a subquery so the main query still has only one category row per relationship.
        $tier_score_subquery = $wpdb->prepare( "
            SELECT
                ap_tier_tr.object_id,
                MAX(
                    CASE
                        WHEN ap_tier_terms.slug = %s THEN 1000
                        WHEN ap_tier_terms.slug = %s THEN 100
                        WHEN ap_tier_terms.slug = %s THEN 10
                        ELSE 1
                    END
                ) AS tier_score
            FROM {$wpdb->term_relationships} AS ap_tier_tr
            INNER JOIN {$wpdb->term_taxonomy} AS ap_tier_tt
                ON ap_tier_tr.term_taxonomy_id = ap_tier_tt.term_taxonomy_id
                AND ap_tier_tt.taxonomy = %s
            INNER JOIN {$wpdb->terms} AS ap_tier_terms
                ON ap_tier_tt.term_id = ap_tier_terms.term_id
                AND ap_tier_terms.slug LIKE %s
            GROUP BY ap_tier_tr.object_id
        ", 'resources-tier-1', 'resources-tier-2', 'resources-tier-3', 'post_tag', 'resources-tier-%' );

        // Join category relationships
        $clauses['join'] .= " LEFT JOIN {$wpdb->term_relationships} AS ap_cat_tr ON {$wpdb->posts}.ID = ap_cat_tr.object_id";
        $clauses['join'] .= " LEFT JOIN {$wpdb->term_taxonomy} AS ap_cat_tt ON ap_cat_tr.term_taxonomy_id = ap_cat_tt.term_taxonomy_id AND ap_cat_tt.taxonomy = 'category'";

        // Join pre-aggregated tier scores (one row per post) to avoid category x tier row multiplication.
        $clauses['join'] .= " LEFT JOIN ({$tier_score_subquery}) AS ap_tier_scores ON {$wpdb->posts}.ID = ap_tier_scores.object_id";

        // Final score = tier_weight + category_relevance_score
        // Tier determines quality band, category score creates diversity within that band
        // Only set GROUP BY if not already set to avoid overwriting other plugins' clauses
        if ( empty( $clauses['groupby'] ) ) {
            $clauses['groupby'] = "{$wpdb->posts}.ID";
        } elseif ( false === strpos( $clauses['groupby'], "{$wpdb->posts}.ID" ) ) {
            $clauses['groupby'] .= ", {$wpdb->posts}.ID";
        }
        $clauses['orderby'] = "COALESCE(ap_tier_scores.tier_score, 1) DESC, SUM({$score_sql}) DESC, {$wpdb->posts}.ID DESC";

        return $clauses;
    }

    /**
     * Apply Action Pack category constraints to the Newspack Content Loop block.
     *
     * @param array<string, mixed>      $parsed_block Parsed block data.
     * @param array<string, mixed>|null $source_block Source block data.
     * @param WP_Block|null             $parent_block Parent block instance.
     * @return array<string, mixed>
     */
    public function filter_action_pack_newspack_block_data( $parsed_block, $source_block, $parent_block ) {
        unset( $source_block, $parent_block );

        if ( ! $this->is_action_pack_page_request() ) {
            return $parsed_block;
        }

        if ( empty( $parsed_block['blockName'] ) ) {
            return $parsed_block;
        }

        if ( null === $this->newspack_block_names ) {
            $this->newspack_block_names = array_unique(
                array_filter(
                    array(
                        'newspack-blocks/homepage-articles',
                        apply_filters( 'newspack_blocks_block_name', 'newspack-blocks/homepage-articles' ),
                    ),
                    'is_string'
                )
            );
        }

        if ( ! in_array( $parsed_block['blockName'], $this->newspack_block_names, true ) ) {
            return $parsed_block;
        }

        if ( empty( $parsed_block['attrs']['className'] ) ) {
            $this->queue_action_pack_debug_entry( 'newspack block missing className', $parsed_block['blockName'] );
            return $parsed_block;
        }

        $class_name = (string) $parsed_block['attrs']['className'];
        if ( false === strpos( $class_name, 'emfn-action-pack' ) ) {
            return $parsed_block;
        }

        $term_ids = $this->get_action_pack_term_ids_from_request();
        if ( empty( $term_ids ) ) {
            $this->queue_action_pack_debug_entry(
                'Block has no valid Action Pack term IDs',
                array( 'className' => $class_name )
            );
            return $parsed_block;
        }

        if ( empty( $parsed_block['attrs'] ) || ! is_array( $parsed_block['attrs'] ) ) {
            $parsed_block['attrs'] = array();
        }

        $parsed_block['attrs']['categories'] = $term_ids;

        $this->queue_action_pack_debug_entry(
            'Block categories applied',
            array(
                'className' => $class_name,
                'termIds'   => $term_ids,
            )
        );

        return $parsed_block;
    }

    /**
     * Mark Newspack block queries for Action Pack scoring.
     * 
     * This runs during pre_get_posts to set a query var on queries created
     * by Newspack blocks that have Action Pack categories applied.
     *
     * @param WP_Query $query The WordPress query object.
     */
    public function mark_action_pack_newspack_queries( $query ) {
        if ( ! $this->is_action_pack_page_request() ) {
            return;
        }

        // Check if this query has Action Pack categories
        $category_in = $query->get( 'category__in' );
        if ( empty( $category_in ) ) {
            return;
        }

        $term_ids = $this->get_action_pack_term_ids_from_request();
        if ( empty( $term_ids ) ) {
            return;
        }

        // If the query's categories match our Action Pack categories, mark it
        if ( ! is_array( $category_in ) ) {
            $category_in = array( $category_in );
        }
        $category_in_ints = array_map( 'intval', $category_in );
        sort( $category_in_ints );
        $term_ids_sorted = array_map( 'intval', $term_ids );
        sort( $term_ids_sorted );

        if ( $category_in_ints === $term_ids_sorted ) {
            $query->set( 'emfn_action_pack', true );
        }
    }

    /**
     * Load the Action Pack category ID order from the tall category CSV.
     * Includes file size validation and error logging for production debugging.
     *
     * @return array<int, int> Category ID order for decoding bit positions
     */
    public function load_tall_category_csv() {
        // Check transient cache first for 24-hour caching
        $cached = get_transient( 'emfn_action_pack_category_order' );
        if ( ! empty( $cached ) && is_array( $cached ) ) {
            return $cached;
        }

        $csv_path = EMFN_ACTION_PACK_PLUGIN_DIR . 'assets/data/_tallCategories.csv';

        // Check file exists and is readable
        if ( ! file_exists( $csv_path ) ) {
            error_log( 'EMFN Action Pack: CSV file not found at ' . $csv_path );
            return array();
        }

        if ( ! is_readable( $csv_path ) ) {
            error_log( 'EMFN Action Pack: CSV file not readable at ' . $csv_path );
            return array();
        }

        // Validate file size to prevent loading huge files (max 5MB)
        $file_size = @filesize( $csv_path );
        if ( false === $file_size || $file_size > 5 * 1024 * 1024 ) {
            error_log( 'EMFN Action Pack: CSV file exceeds maximum size (size: ' . ( $file_size ?: 'unknown' ) . ' bytes)' );
            return array();
        }

        // Open file with error suppression to avoid warnings
        $handle = @fopen( $csv_path, 'r' );
        if ( false === $handle ) {
            error_log( 'EMFN Action Pack: Failed to open CSV file at ' . $csv_path );
            return array();
        }

        // Use try-finally to ensure file is closed even if error occurs
        try {
            $header = fgetcsv( $handle );
            if ( ! is_array( $header ) || empty( $header ) ) {
                error_log( 'EMFN Action Pack: Invalid or empty CSV header' );
                return array();
            }

            $normalized_header = array_map(
                static function ( $value ) {
                    return trim( strtolower( (string) $value ) );
                },
                $header
            );

            $cat_id_index      = array_search( 'catid', $normalized_header, true );
            $manual_rank_index = array_search( 'manualrank', $normalized_header, true );

            if ( false === $cat_id_index || false === $manual_rank_index ) {
                error_log( 'EMFN Action Pack: CSV header missing required columns (catid, manualrank)' );
                return array();
            }

            $cat_id_ranks     = array();
            $cat_id_positions = array();
            $cat_id_order     = array();

            while ( false !== ( $row = fgetcsv( $handle ) ) ) {
                $cat_id = isset( $row[ $cat_id_index ] )
                    ? (int) trim( (string) $row[ $cat_id_index ] )
                    : 0;
                $manual_rank = isset( $row[ $manual_rank_index ] )
                    ? (int) trim( (string) $row[ $manual_rank_index ] )
                    : 0;

                if ( 0 === $cat_id ) {
                    continue;
                }

                if ( ! array_key_exists( $cat_id, $cat_id_ranks ) ) {
                    $cat_id_positions[ $cat_id ] = count( $cat_id_order );
                    $cat_id_order[]              = $cat_id;
                    $cat_id_ranks[ $cat_id ]     = $manual_rank;
                } else {
                    $cat_id_ranks[ $cat_id ] = max( $cat_id_ranks[ $cat_id ], $manual_rank );
                }
            }

            usort(
                $cat_id_order,
                static function ( $left, $right ) use ( $cat_id_ranks, $cat_id_positions ) {
                    $left_rank  = $cat_id_ranks[ $left ] ?? 0;
                    $right_rank = $cat_id_ranks[ $right ] ?? 0;

                    if ( $left_rank !== $right_rank ) {
                        return $right_rank <=> $left_rank;
                    }

                    return ( $cat_id_positions[ $left ] ?? 0 ) <=> ( $cat_id_positions[ $right ] ?? 0 );
                }
            );

            // Cache the result for 24 hours
            set_transient( 'emfn_action_pack_category_order', $cat_id_order, DAY_IN_SECONDS );

            return $cat_id_order;

        } finally {
            @fclose( $handle );
        }
    }

    /**
     * Decode the compact bitmask/base36 Action Pack payload format.
     *
     * @param string $payload Action Pack payload with prefix
     * @return array<int, int>|null Array of WordPress term IDs
     */
    private function decode_action_pack_bitmask_payload( $payload ) {
        // strip the format prefix so only the encoded bitmask segments remain
        $encoded_payload = substr( $payload, strlen( self::ACTION_PACK_PAYLOAD_PREFIX ) );

        // stop if post-prefix payload is not a valid Action Pack selection
        if ( '' === $encoded_payload ) {
            return null;
        }

        if ( ! is_array( $this->action_pack_category_order ) ) {
            $this->action_pack_category_order = $this->load_tall_category_csv();
        }

        if ( empty( $this->action_pack_category_order ) ) {
            return null;
        }

        $category_id_order = $this->action_pack_category_order;

        // each dot-separated chunk is one base36-encoded 31-bit segment
        $resolved_category_ids = array();
        $segments              = explode( '.', $encoded_payload );

        // walk through each segment and decode it back into category IDs based on bit positions
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
            // each set bit maps to one category ID index in the shared order
            for ( $bit_index = 0; $bit_index < self::ACTION_PACK_SEGMENT_SIZE; $bit_index++ ) {
                $mask           = 1 << $bit_index;
                $category_index = ( $segment_index * self::ACTION_PACK_SEGMENT_SIZE ) + $bit_index;

                // skip bits that are off and skip indexes beyond the known category list
                if ( 0 === ( $segment_value & $mask ) || ! isset( $category_id_order[ $category_index ] ) ) {
                    continue;
                }

                // append the category ID that lives at this bit position
                $resolved_category_ids[] = $category_id_order[ $category_index ];
            }
        }

        // return null when nothing valid was decoded so callers can bail cleanly
        return ! empty( $resolved_category_ids ) ? $resolved_category_ids : null;
    }
}