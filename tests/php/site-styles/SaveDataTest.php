<?php
/**
 * Tests for the Save-Data support in EMFN Site Styles Plugin.
 * Covers hook registration, the `emfn-save-data` body class and the Vary header.
 *
 * @package EMFN_Site_Styles_Plugin
 */

use PHPUnit\Framework\TestCase;

if ( ! class_exists( 'EMFN_Site_Styles_Plugin' ) ) {
    require_once dirname( __DIR__, 3 ) . '/plugins/emfn-site-styles-plugin/includes/class-emfn-site-styles-plugin.php';
}

class SaveDataTest extends TestCase {

    /** @var array<string,mixed> */
    private $original_server;

    protected function setUp(): void {
        global $_test_hooks, $_test_is_admin;
        $this->original_server = $_SERVER;
        unset( $_SERVER['HTTP_SAVE_DATA'] );
        $_test_hooks    = array();
        $_test_is_admin = false;

        // Reset the singleton so each test can observe hook registration
        $instance = new ReflectionProperty( EMFN_Site_Styles_Plugin::class, 'instance' );
        $instance->setValue( null, null );
    }

    protected function tearDown(): void {
        $_SERVER = $this->original_server;
    }

    public function test_constructor_registers_hooks(): void {
        global $_test_hooks;
        $plugin = EMFN_Site_Styles_Plugin::get_instance();

        $this->assertContains( array( $plugin, 'enqueue_assets' ), $_test_hooks['wp_enqueue_scripts'] );
        $this->assertContains( array( $plugin, 'send_vary_header' ), $_test_hooks['send_headers'] );
        $this->assertContains( array( $plugin, 'add_save_data_body_class' ), $_test_hooks['body_class'] );
    }

    public function test_get_instance_returns_same_instance(): void {
        $this->assertSame( EMFN_Site_Styles_Plugin::get_instance(), EMFN_Site_Styles_Plugin::get_instance() );
    }

    public function test_body_class_added_when_save_data_on(): void {
        $_SERVER['HTTP_SAVE_DATA'] = 'on';

        $classes = EMFN_Site_Styles_Plugin::get_instance()->add_save_data_body_class( array( 'home' ) );

        $this->assertSame( array( 'home', 'emfn-save-data' ), $classes );
    }

    /**
     * @dataProvider save_data_on_variants
     */
    public function test_body_class_is_case_and_whitespace_insensitive( string $value ): void {
        $_SERVER['HTTP_SAVE_DATA'] = $value;

        $classes = EMFN_Site_Styles_Plugin::get_instance()->add_save_data_body_class( array() );

        $this->assertSame( array( 'emfn-save-data' ), $classes );
    }

    /**
     * @return array<string,array{string}>
     */
    public static function save_data_on_variants(): array {
        return array(
            'uppercase'  => array( 'ON' ),
            'mixed case' => array( 'On' ),
            'padded'     => array( ' on ' ),
        );
    }

    /**
     * @dataProvider save_data_off_values
     */
    public function test_body_class_not_added_for_other_values( string $value ): void {
        $_SERVER['HTTP_SAVE_DATA'] = $value;

        $classes = EMFN_Site_Styles_Plugin::get_instance()->add_save_data_body_class( array( 'home' ) );

        $this->assertSame( array( 'home' ), $classes );
    }

    /**
     * @return array<string,array{string}>
     */
    public static function save_data_off_values(): array {
        return array(
            'off'           => array( 'off' ),
            'empty'         => array( '' ),
            'numeric'       => array( '1' ),
            'true'          => array( 'true' ),
            'on with extra' => array( 'on, off' ),
        );
    }

    public function test_body_class_not_added_without_header(): void {
        $classes = EMFN_Site_Styles_Plugin::get_instance()->add_save_data_body_class( array( 'home' ) );

        $this->assertSame( array( 'home' ), $classes );
    }

    public function test_body_class_preserves_existing_classes_and_order(): void {
        $_SERVER['HTTP_SAVE_DATA'] = 'on';

        $classes = EMFN_Site_Styles_Plugin::get_instance()->add_save_data_body_class( array( 'a', 'b' ) );

        $this->assertSame( array( 'a', 'b', 'emfn-save-data' ), $classes );
    }

    public function test_vary_header_sent_on_frontend(): void {
        $this->assertContains( 'Vary: Save-Data', $this->request_headers( '/' ) );
    }

    public function test_vary_header_not_sent_in_admin(): void {
        $this->assertNotContains( 'Vary: Save-Data', $this->request_headers( '/?admin=1' ) );
    }

    /**
     * Request the router on PHP's built-in server; CLI cannot report headers itself.
     *
     * @return string[] Response header lines.
     */
    private function request_headers( string $path ): array {
        $port = self::$port;
        $body = @file_get_contents( "http://127.0.0.1:{$port}{$path}" );
        $this->assertSame( 'ok', $body, 'Router did not respond as expected' );
        return $http_response_header;
    }

    /** @var resource|null */
    private static $server = null;

    /** @var int */
    private static $port = 0;

    public static function setUpBeforeClass(): void {
        $probe = stream_socket_server( 'tcp://127.0.0.1:0' );
        self::$port = (int) substr( strrchr( stream_socket_get_name( $probe, false ), ':' ), 1 );
        fclose( $probe );

        $router = __DIR__ . '/header-router.php';
        $cmd    = array( PHP_BINARY, '-S', '127.0.0.1:' . self::$port, $router );
        self::$server = proc_open(
            $cmd,
            array( 1 => array( 'file', '/dev/null', 'w' ), 2 => array( 'file', '/dev/null', 'w' ) ),
            $pipes,
            __DIR__,
            array( 'XDEBUG_MODE' => 'off', 'PATH' => getenv( 'PATH' ) )
        );

        for ( $i = 0; $i < 50; $i++ ) {
            $conn = @fsockopen( '127.0.0.1', self::$port );
            if ( $conn ) {
                fclose( $conn );
                return;
            }
            usleep( 100000 );
        }
        self::fail( 'Built-in PHP server did not start' );
    }

    public static function tearDownAfterClass(): void {
        if ( is_resource( self::$server ) ) {
            proc_terminate( self::$server );
            proc_close( self::$server );
        }
    }
}
