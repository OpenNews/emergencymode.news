<?php
/**
 * Plugin Name:       EMFN Action Pack Plugin
 * Plugin URI:        https://github.com/OpenNews/emergencymode.news/tree/main/plugins/emfn-action-pack-plugin/
 * Description:       Custom plugin that drives the Action Pack portion of EMFN's site.
 * Version:           9.9.9
 * Requires at least: 6.3
 * Requires PHP:      8.0
 * Author:            Emergency Mode / EMFN
 * Author URI:        https://emergencymode.news
 * License:           MIT
 * License URI:       https://opensource.org/licenses/MIT
 * Text Domain:       emfn-action-pack-plugin
 * Domain Path:       /languages
 *
 * @package EMFN_Action_Pack_Plugin
 *
 * ============================================================================
 * CONTENT STRATEGY DOCUMENTATION FOR DATA REPORTERS & EDITORS
 * ============================================================================
 *
 * TIER SYSTEM (Primary Ranking Factor)
 * ====================================
 * Tag all Action Pack content with one of three quality tiers:
 *   - resources-tier-1 (30%): Flagship resources, thoroughly vetted guides, essential practices
 *   - resources-tier-2 (50%): Solid supporting content, case studies, practical templates
 *   - resources-tier-3 (20%): Supplementary material, experimental approaches, niche topics
 *
 * Why: Tier-1 content always ranks above tier-2 regardless of category matching. This ensures
 * your editorial priorities control results, not just popularity or scarcity.
 *
 * CATEGORY WEIGHTS (Secondary Ranking Factor)
 * ============================================
 * Quiz responses create weighted categories. Categories matching MORE quiz answers get higher
 * weight. Within each tier, the algorithm adds:
 *   - Category weight: How many quiz answers matched
 *   - Multi-category bonus: Articles covering multiple relevant categories score higher
 *   - Scarcity multiplier: Articles in categories with fewer posts get a boost
 *
 * Example: If "Staff safety" has 8 articles but "Field reporting" has only 3, field reporting
 * articles receive a 2.67× boost to prevent one category from dominating results.
 *
 * MONITORING CONTENT GAPS
 * ======================
 * Track category post counts with this SQL:
 *
 *   SELECT 
 *       t.name AS category,
 *       COUNT(DISTINCT p.ID) AS post_count
 *   FROM wp_terms t
 *   JOIN wp_term_taxonomy tt ON t.term_id = tt.term_id
 *   LEFT JOIN wp_term_relationships tr ON tt.term_taxonomy_id = tr.term_taxonomy_id
 *   LEFT JOIN wp_posts p ON tr.object_id = p.ID AND p.post_status = 'publish'
 *   WHERE tt.taxonomy = 'category'
 *       AND t.term_id IN (110, 155, 113, ...) -- Action Pack category IDs
 *   GROUP BY t.term_id
 *   ORDER BY post_count ASC;
 *
 * Target: 3-5 posts per Action Pack category. 0-1 post categories signal content gaps.
 *
 * PERFORMANCE THRESHOLDS FOR DEVELOPERS
 * ======================================
 * Current implementation optimized for 50-500 posts. Scaling strategy:
 *   - 50-200 posts:   Ship as-is (current state)
 *   - 200-500 posts:  Monitor query performance (no changes needed)
 *   - 500-1000 posts: Add transient caching for term counts (~50% speedup)
 *   - 1000-2000 posts: Limit matched categories to top 30 (complex JOIN reduction)
 *   - 2000+ posts:     Add tier tag detection caching (~30% speedup) + database indexes
 *
 * Current benchmarks:
 *   - At 50 posts:   <5ms per request
 *   - At 500 posts:  <3ms with caching (vs ~8ms without)
 *   - At 2000 posts: <10ms with all optimizations (vs ~40ms without)
 * ============================================================================
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

define( 'EMFN_ACTION_PACK_PLUGIN_VERSION', '9.9.9' );
define( 'EMFN_ACTION_PACK_PLUGIN_DIR', plugin_dir_path( __FILE__ ) );
define( 'EMFN_ACTION_PACK_PLUGIN_URL', plugin_dir_url( __FILE__ ) );

require_once EMFN_ACTION_PACK_PLUGIN_DIR . 'includes/class-emfn-action-pack-plugin.php';

/**
 * Initialise the plugin.
 */
function emfn_action_pack_plugin_init() {
    EMFN_Action_Pack_Plugin::get_instance();
}
add_action( 'plugins_loaded', 'emfn_action_pack_plugin_init' );
