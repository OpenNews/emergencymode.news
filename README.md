# emergencymode.news

Code storage for customizations, plugins, and theme work related to the Emergency Mode / EMFN WordPress Newspack instance.

## Overview

This repository holds custom code that extends and customizes the [Newspack](https://newspack.com/) WordPress platform powering emergencymode.news. It is organized to reflect how WordPress loads and applies customizations, making it easy to deploy files to the correct locations on the server.

## Repository Structure

```
emergencymode.news/
├── customizations/          # Standalone CSS/JS injected via Newspack or a custom plugin
│   ├── css/
│   │   └── emfn-custom.css  # Site-wide style overrides
│   └── js/
│       └── emfn-custom.js   # Site-wide script enhancements
│
├── mu-plugins/              # Must-use plugins (auto-loaded; no activation required)
│   └── emfn-mu-loader.php   # Loads any shared utilities needed site-wide
│
├── plugins/                 # Custom plugins (activated through WP Admin > Plugins)
│   └── emfn-example-plugin/ # Example Telex-generated plugin scaffold
│       ├── emfn-example-plugin.php
│       ├── readme.txt
│       ├── includes/
│       │   └── class-emfn-example-plugin.php
│       ├── assets/
│       │   ├── css/
│       │   │   └── emfn-example-plugin.css
│       │   └── js/
│       │       └── emfn-example-plugin.js
│       └── languages/
│
└── themes/
    └── emfn-child/          # Child theme extending the active Newspack theme
        ├── style.css        # Child theme declaration + style overrides
        ├── functions.php    # Enqueue scripts/styles; hook customizations
        └── assets/
            ├── css/
            │   └── emfn-child.css
            └── js/
                └── emfn-child.js
```

## Connection Points

### Newspack / WordPress Server

| Repo path | WordPress server path |
|---|---|
| `mu-plugins/` | `wp-content/mu-plugins/` |
| `plugins/<plugin-name>/` | `wp-content/plugins/<plugin-name>/` |
| `themes/emfn-child/` | `wp-content/themes/emfn-child/` |
| `customizations/` | Deployed via Newspack > Customization or enqueued by a plugin |

### Deploying Changes

1. **Child theme** – Copy `themes/emfn-child/` to `wp-content/themes/emfn-child/` and activate it in *Appearance > Themes*.
2. **Custom plugins** – Copy the plugin folder to `wp-content/plugins/` and activate in *Plugins*.
3. **Must-use plugins** – Copy files to `wp-content/mu-plugins/`; they are active automatically.
4. **Custom CSS/JS** – Either enqueue through the child theme's `functions.php` or upload to Newspack's *Customization > Additional CSS/JS* panels.

> **Tip:** For Telex-generated plugins, the AI tool produces a ready-to-install ZIP file. Unzip it into `plugins/` here and install it via *Plugins > Add New > Upload Plugin* or by copying directly to the server.

## Telex Plugin Workflow

[Telex](https://telex.automattic.ai/) is an AI-powered WordPress plugin generator by Automattic. When Telex produces a plugin:

1. It outputs a **ZIP archive** named `<plugin-slug>.zip`.
2. Unzip the archive into `plugins/<plugin-slug>/`.
3. The resulting folder follows the standard layout:
   ```
   <plugin-slug>/
   ├── <plugin-slug>.php   ← main file with Plugin Header
   ├── readme.txt
   ├── includes/           ← PHP classes
   ├── assets/
   │   ├── css/
   │   └── js/
   └── languages/          ← .pot translation template
   ```
4. Commit the unzipped folder to this repo for version control.
5. Deploy to the server (see *Deploying Changes* above).

## Newspack Customization Notes

- **Custom CSS** can be added in WordPress Admin under *Newspack > Customization* or through the standard WordPress *Appearance > Customize > Additional CSS* panel.
- **Hooks and filters** for Newspack-specific behavior live in `themes/emfn-child/functions.php` or in a dedicated mu-plugin.
- **Newspack Plugin documentation:** https://github.com/Automattic/newspack-plugin
- **Newspack Blocks documentation:** https://github.com/Automattic/newspack-blocks

## Development Notes

- WordPress version and plugin dependencies are managed on the hosted Newspack environment; this repo stores only *custom* code.
- Follow WordPress coding standards: https://developer.wordpress.org/coding-standards/
- Prefix all custom functions, classes, and hooks with `emfn_` to avoid conflicts.

