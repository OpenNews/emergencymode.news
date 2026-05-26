<?php
/**
 * Tests for Action Pack payload decoding (PHP)
 * Verifies that base36-encoded bitmask segments are correctly decoded to category IDs
 *
 * @package EMFN_Action_Pack_Plugin
 */

use PHPUnit\Framework\TestCase;

// Load the plugin class if not already loaded
if ( ! class_exists( 'EMFN_Action_Pack_Plugin' ) ) {
    if ( defined( 'EMFN_ACTION_PACK_PLUGIN_DIR' ) ) {
        require_once EMFN_ACTION_PACK_PLUGIN_DIR . 'includes/class-emfn-action-pack-plugin.php';
    }
}

/**
 * Testable wrapper for the plugin class
 * Extends the actual plugin to expose protected methods for testing
 */
class Testable_EMFN_Action_Pack_Plugin extends EMFN_Action_Pack_Plugin {
    /**
     * Public constructor for testing (bypasses singleton pattern)
     */
    public function __construct() {
        // Don't call parent constructor to avoid registering WordPress hooks
        // We only need the decode logic for testing
    }
    
    /**
     * Expose the protected decode method for testing
     *
     * @param string $payload Action Pack payload with prefix
     * @return array<int>|null Array of category IDs
     */
    public function test_decode_action_pack_bitmask_payload( $payload ) {
        return $this->decode_action_pack_bitmask_payload( $payload );
    }

    /**
     * Set the category order for testing (bypassing CSV load)
     *
     * @param array<int> $category_order Category IDs in order
     */
    public function set_category_order_for_testing( $category_order ) {
        // Access the parent class property using Reflection
        $reflection = new ReflectionClass( 'EMFN_Action_Pack_Plugin' );
        $property = $reflection->getProperty( 'action_pack_category_order' );
        $property->setValue( $this, $category_order );
    }
}

/**
 * Test class for payload decoding
 */
class PayloadDecodingTest extends TestCase {
    private $category_order;
    private $plugin;
    private $test_cases;

    protected function setUp(): void {
        parent::setUp();

        // Load test fixtures
        $fixtures_path = dirname( __DIR__, 2 ) . '/fixtures/payload-test-cases.json';
        $fixtures_data = json_decode( file_get_contents( $fixtures_path ), true );

        $this->category_order = $fixtures_data['categoryOrder'];
        $this->test_cases     = $fixtures_data['testCases'];
        
        // Create testable plugin instance and set category order
        $this->plugin = new Testable_EMFN_Action_Pack_Plugin();
        $this->plugin->set_category_order_for_testing( $this->category_order );
    }

    /**
     * Test: Decodes single category at position zero
     */
    public function testItDecodesSingleCategoryAtPositionZero() {
        $result = $this->plugin->test_decode_action_pack_bitmask_payload( 'ap2.1' );
        $this->assertEquals( array( 57 ), $result );
    }

    /**
     * Test: Decodes single category at position one
     */
    public function testItDecodesSingleCategoryAtPositionOne() {
        $result = $this->plugin->test_decode_action_pack_bitmask_payload( 'ap2.2' );
        $this->assertEquals( array( 58 ), $result );
    }

    /**
     * Test: Decodes two categories
     */
    public function testItDecodesTwoCategories() {
        $result = $this->plugin->test_decode_action_pack_bitmask_payload( 'ap2.3' );
        $this->assertEquals( array( 57, 58 ), $result );
    }

    /**
     * Test: Decodes multiple categories
     */
    public function testItDecodesMultipleCategories() {
        $result = $this->plugin->test_decode_action_pack_bitmask_payload( 'ap2.f' );
        $this->assertEquals( array( 57, 58, 59, 39 ), $result );
    }

    /**
     * Test: Decodes all test categories
     */
    public function testItDecodesAllTestCategories() {
        $result = $this->plugin->test_decode_action_pack_bitmask_payload( 'ap2.sf' );
        $this->assertEquals( $this->category_order, $result );
    }

    /**
     * Test: Handles empty payload
     */
    public function testItHandlesEmptyPayload() {
        $result = $this->plugin->test_decode_action_pack_bitmask_payload( 'ap2.0' );
        $this->assertNull( $result );
    }

    /**
     * Test: Handles missing prefix
     */
    public function testItHandlesMissingPrefix() {
        $result = $this->plugin->test_decode_action_pack_bitmask_payload( 'xxx' );
        // Payload without proper prefix - substr will give empty string after removing prefix
        // Actually substr('xxx', 4) = '' so this should return null
        $this->assertNull( $result );
        
        // Also test a short payload that would give unexpected results
        $result2 = $this->plugin->test_decode_action_pack_bitmask_payload( 'a' );
        // substr('a', 4) = '' → null
        $this->assertNull( $result2 );
    }

    /**
     * Test: Rejects invalid characters
     */
    public function testItRejectsInvalidCharacters() {
        $result = $this->plugin->test_decode_action_pack_bitmask_payload( 'ap2.1G' ); // Uppercase not allowed
        $this->assertNull( $result );

        $result = $this->plugin->test_decode_action_pack_bitmask_payload( 'ap2.1$' ); // Special char not allowed
        $this->assertNull( $result );
    }

    /**
     * Test: Handles multi-segment payloads
     */
    public function testItHandlesMultiSegmentPayloads() {
        // Create a plugin with 64 categories to test multi-segment
        $large_category_order = range( 1000, 1063 );
        $plugin_large = new Testable_EMFN_Action_Pack_Plugin();
        $plugin_large->set_category_order_for_testing( $large_category_order );

        // Payload: segment 0 = 1 (bit 0), segment 1 = 3 (bits 0,1)
        // Should decode to categories at positions 0, 31, 32
        $result = $plugin_large->test_decode_action_pack_bitmask_payload( 'ap2.1.3' );
        $this->assertEquals( array( 1000, 1031, 1032 ), $result );
    }

    /**
     * Test: Preserves category order from bit positions
     */
    public function testItPreservesCategoryOrderFromBitPositions() {
        // Test that categories come out in bit position order
        // Payload 'ap2.4x' = 177 decimal = 0b10110001
        // Bits set: 0, 4, 5, 7
        // Categories at those positions: 57, 3, 2, 121
        $result = $this->plugin->test_decode_action_pack_bitmask_payload( 'ap2.4x' );
        $this->assertEquals( array( 57, 3, 2, 121 ), $result );
    }

    /**
     * Test: Passes round-trip test cases
     *
     * @dataProvider roundTripTestCasesProvider
     */
    public function testItPassesRoundTripTestCases( $test_case ) {
        if ( ! isset( $test_case['expectedPayload'] ) ) {
            $this->markTestSkipped( 'No expected payload defined' );
        }

        $result = $this->plugin->test_decode_action_pack_bitmask_payload( $test_case['expectedPayload'] );

        // For empty category list, expect null
        if ( empty( $test_case['categoryIds'] ) ) {
            $this->assertNull( $result );
            return;
        }

        // Filter out unknown categories (those not in category order)
        $expected_categories = array_values(
            array_filter(
                $test_case['categoryIds'],
                function ( $cat_id ) {
                    return in_array( $cat_id, $this->category_order, true );
                }
            )
        );

        // Sort by position in category order
        usort(
            $expected_categories,
            function ( $a, $b ) {
                $pos_a = array_search( $a, $this->category_order, true );
                $pos_b = array_search( $b, $this->category_order, true );
                return $pos_a - $pos_b;
            }
        );

        $this->assertEquals( $expected_categories, $result, $test_case['name'] );
    }

    /**
     * Data provider for round-trip test cases
     */
    public static function roundTripTestCasesProvider(): array {
        // Load test fixtures
        $fixtures_path = dirname( __DIR__, 2 ) . '/fixtures/payload-test-cases.json';
        $fixtures_data = json_decode( file_get_contents( $fixtures_path ), true );
        
        $test_cases = $fixtures_data['testCases'];
        $cases = array();

        foreach ( $test_cases as $test_case ) {
            if ( isset( $test_case['expectedPayload'] ) ) {
                $cases[ $test_case['name'] ] = array( $test_case );
            }
        }

        return $cases;
    }

    /**
     * Test: Handles whitespace in segments
     */
    public function testItHandlesWhitespaceInSegments() {
        $result = $this->plugin->test_decode_action_pack_bitmask_payload( 'ap2. 3 ' ); // Spaces around segment
        // Trimmed segment should work
        $this->assertEquals( array( 57, 58 ), $result );
    }

    /**
     * Test: Rejects empty segments
     */
    public function testItRejectsEmptySegments() {
        $result = $this->plugin->test_decode_action_pack_bitmask_payload( 'ap2.' );
        $this->assertNull( $result );

        $result = $this->plugin->test_decode_action_pack_bitmask_payload( 'ap2.1..3' ); // Empty middle segment
        $this->assertNull( $result );
    }

    /**
     * Test: Handles large base36 values
     */
    public function testItHandlesLargeBase36Values() {
        // 'zzzz' in base36 = 1679615 decimal
        // This is larger than any single segment should be, but tests overflow handling
        $result = $this->plugin->test_decode_action_pack_bitmask_payload( 'ap2.zzzz' );
        // Should decode but may not map to any categories
        $this->assertIsArray( $result );
    }

    /**
     * Test: Stops at category order boundary
     */
    public function testItStopsAtCategoryOrderBoundary() {
        // Segment with all bits set (2147483647 = 0x7FFFFFFF)
        // But we only have 10 categories, so should only decode positions 0-9
        $all_bits = base_convert( '2147483647', 10, 36 );
        $result   = $this->plugin->test_decode_action_pack_bitmask_payload( "ap2.{$all_bits}" );

        // Should only get the 10 categories we have defined
        $this->assertCount( 10, $result );
        $this->assertEquals( $this->category_order, $result );
    }
}
