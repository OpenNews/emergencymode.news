#!/usr/bin/env bash

set -euo pipefail

# Parse arguments
PLUGIN_NAME=""
version=""
output_dir=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --plugin)
      if [[ -z "${2:-}" ]]; then
        echo "Error: --plugin requires a plugin name argument" >&2
        exit 1
      fi
      PLUGIN_NAME="$2"
      shift 2
      ;;
    *)
      if [[ -z "$version" ]]; then
        version="$1"
      elif [[ -z "$output_dir" ]]; then
        output_dir="$1"
      else
        echo "Error: Unexpected argument '$1'" >&2
        echo "Usage: $0 [--plugin <name>] <version> <output-dir>" >&2
        exit 1
      fi
      shift
      ;;
  esac
done

# Validate required arguments
if [[ -z "$version" || -z "$output_dir" ]]; then
  echo "Usage: $0 [--plugin <name>] <version> <output-dir>" >&2
  echo "" >&2
  echo "Options:" >&2
  echo "  --plugin <name>   Only build specified plugin (e.g., emfn-action-pack-plugin)" >&2
  echo "" >&2
  echo "Examples:" >&2
  echo "  $0 --plugin emfn-action-pack-plugin 0.3.2 dist" >&2
  echo "  $0 0.3.2 dist  # Build all plugins" >&2
  exit 1
fi

if [[ ! "$version" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "Version must be semver in the form X.Y.Z" >&2
  exit 1
fi

repo_root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$repo_root"

rm -rf "$output_dir"
mkdir -p "$output_dir"

build_plugin_zip() {
  local plugin_dir="$1"
  local archive_name="$2"

  # Verify plugin directory exists
  if [[ ! -d "plugins/$plugin_dir" ]]; then
    echo "Error: Plugin directory not found: plugins/$plugin_dir" >&2
    exit 1
  fi

  echo "Building $archive_name..." >&2
  (
    cd plugins
    zip -qr "$repo_root/$output_dir/$archive_name" "$plugin_dir"
  )
  echo "✓ Built $archive_name" >&2
}

# Build plugin(s) based on --plugin flag
if [[ -n "$PLUGIN_NAME" ]]; then
  # Plugin-specific mode: only build specified plugin
  build_plugin_zip "$PLUGIN_NAME" "$PLUGIN_NAME-$version.zip"
else
  # Legacy mode: build all plugins
  echo "Building all plugins..." >&2
  build_plugin_zip "emfn-action-pack-plugin" "emfn-action-pack-plugin-$version.zip"
  build_plugin_zip "emfn-site-styles-plugin" "emfn-site-styles-plugin-$version.zip"
  echo "✓ Built all plugins" >&2
fi
# build_plugin_zip "emfn-rich-search-plugin" "emfn-rich-search-plugin-$version.zip"