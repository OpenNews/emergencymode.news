# emergencymode.news

Code storage for customizations, plugins, and theme work related to the Emergency Mode / EMFN WordPress Newspack instance.

## Overview

This repository holds custom code that extends and customizes the [Newspack](https://newspack.com/) WordPress platform powering emergencymode.news. It is organized to reflect how WordPress loads and applies customizations, making it easy to deploy files to the correct locations on the server.

## Repository Structure

```
emergencymode.news/
├── notebooks/               # Python notebooks for data analysis (uv-based)
│   ├── disaster_risk_analysis.ipynb  # FEMA disaster risk data analysis
│   ├── generate_sample_data.py       # Sample data generator
│   ├── sample_data/                  # Sample NRI data for testing
│   └── README.md                     # Notebooks documentation
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

| Repo path                | WordPress server path                                         |
| ------------------------ | ------------------------------------------------------------- |
| `mu-plugins/`            | `wp-content/mu-plugins/`                                      |
| `plugins/<plugin-name>/` | `wp-content/plugins/<plugin-name>/`                           |
| `themes/emfn-child/`     | `wp-content/themes/emfn-child/`                               |
| `customizations/`        | Deployed via Newspack > Customization or enqueued by a plugin |
| `notebooks/`             | Not deployed to WordPress (data analysis/journalism tools)    |

### Deploying Changes

1. **Child theme** – Copy `themes/emfn-child/` to `wp-content/themes/emfn-child/` and activate it in _Appearance > Themes_.
2. **Custom plugins** – Copy the plugin folder to `wp-content/plugins/` and activate in _Plugins_.
3. **Must-use plugins** – Copy files to `wp-content/mu-plugins/`; they are active automatically.
4. **Custom CSS/JS** – Either enqueue through the child theme's `functions.php` or upload to Newspack's _Customization > Additional CSS/JS_ panels.

> **Tip:** For Telex-generated plugins, the AI tool produces a ready-to-install ZIP file. Unzip it into `plugins/` here and install it via _Plugins > Add New > Upload Plugin_ or by copying directly to the server.

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
5. Deploy to the server (see _Deploying Changes_ above).

## Data Analysis Notebooks

The `notebooks/` directory contains Python notebooks for data journalism and analysis work. These are managed with [uv](https://github.com/astral-sh/uv) and are **not deployed to the WordPress server**.

### Getting Started with Notebooks

1. **Install uv** (if not already installed):
   ```bash
   pip install uv
   ```

2. **Install dependencies**:
   ```bash
   uv sync
   ```

3. **Start JupyterLab**:
   ```bash
   uv run jupyter lab
   ```

4. **Open a notebook**: Navigate to `notebooks/` and open the desired `.ipynb` file

### Available Notebooks

- **disaster_risk_analysis.ipynb**: Analyzes FEMA National Risk Index data and generates county-level disaster risk projections for mapping and visualization

See `notebooks/README.md` for detailed documentation on each notebook.

## Newspack Customization Notes

- **Custom CSS** can be added in WordPress Admin under _Newspack > Customization_ or through the standard WordPress _Appearance > Customize > Additional CSS_ panel.
- **Hooks and filters** for Newspack-specific behavior live in `themes/emfn-child/functions.php` or in a dedicated mu-plugin.
- **Newspack Plugin documentation:** https://github.com/Automattic/newspack-plugin
- **Newspack Blocks documentation:** https://github.com/Automattic/newspack-blocks

## Development Notes

- WordPress version and plugin dependencies are managed on the hosted Newspack environment; this repo stores only _custom_ code.
- Follow WordPress coding standards: https://developer.wordpress.org/coding-standards/
- Prefix all custom functions, classes, and hooks with `emfn_` to avoid conflicts.
