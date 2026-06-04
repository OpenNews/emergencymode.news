---
description: "WordPress plugin development standards for EMFN. Use when: creating WordPress plugins, editing plugin PHP files, implementing singleton patterns, managing plugin versions, enqueuing assets in WordPress."
applyTo: "plugins/**/*.php"
---

# WordPress Plugin Standards for EMFN

## Singleton Pattern (Required)

All EMFN plugins use singleton pattern:

```php
class Plugin_Name {
    private static $instance = null;
    
    public static function get_instance() {
        if ( null === self::$instance ) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    private function __construct() {
        // Register hooks only - no logic here
    }
}
```

## Plugin Structure

```
plugins/{plugin-name}/
├── {plugin-name}.php               # Main file with plugin header
├── includes/
│   └── class-{plugin-name}.php     # Singleton class
├── assets/
│   ├── css/
│   ├── scss/
│   └── js/
└── languages/
```

## Version Management

**Critical:** Sync version across THREE locations:

1. **Plugin header** (`{plugin-name}.php`):
   ```php
   * Version: 0.3.1
   ```

2. **PHP constant** (`{plugin-name}.php`):
   ```php
   define( 'PLUGIN_NAME_VERSION', '0.3.1' );
   ```

3. **package.json** (if using npm build):
   ```json
   "version": "0.3.1"
   ```

## Asset Enqueuing

Use version constant for cache busting:

```php
public function enqueue_assets() {
    wp_enqueue_style(
        'plugin-handle',
        PLUGIN_URL . 'assets/css/styles.css',
        array(),
        PLUGIN_VERSION  // Cache busting
    );
}
```

## Newspack Constraints

- **NO child themes** - Newspack sites don't support them
- Custom styles MUST be via plugin enqueuing
- Plugin CSS loads after theme, so it overrides
- Use `!important` sparingly for third-party conflicts

## WordPress Coding Standards

- **Indentation:** Tabs, not spaces
- **Conditionals:** Yoda style (`'value' === $var`)
- **Naming:** Snake_case for classes, snake_case for functions
- **Prefix:** All functions/constants with unique prefix
- **Security:** Escape output, sanitize input, check nonces
- **I18n:** Use text domain from plugin header

## Hook Registration

Register ALL hooks in constructor, implement in separate methods:

```php
private function __construct() {
    add_action( 'wp_enqueue_scripts', array( $this, 'enqueue_assets' ) );
    add_filter( 'query_loop_block_query_vars', array( $this, 'filter_query' ), 10, 3 );
}

public function enqueue_assets() {
    // Implementation
}

public function filter_query( $vars, $block, $page ) {
    // Implementation
}
```

## Constants Pattern

Define at top of main plugin file:

```php
define( 'PLUGIN_VERSION', '0.1.0' );
define( 'PLUGIN_DIR', plugin_dir_path( __FILE__ ) );
define( 'PLUGIN_URL', plugin_dir_url( __FILE__ ) );
```

## File Headers

All PHP files start with:

```php
<?php
/**
 * Description of file purpose.
 *
 * @package Plugin_Name
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}
```
