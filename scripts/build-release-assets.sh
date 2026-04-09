#!/usr/bin/env bash

set -euo pipefail

if [[ $# -ne 2 ]]; then
  echo "Usage: $0 <version> <output-dir>" >&2
  exit 1
fi

version="$1"
output_dir="$2"

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

  (
    cd plugins
    zip -qr "$repo_root/$output_dir/$archive_name" "$plugin_dir"
  )
}

build_plugin_zip "emfn-action-pack-plugin" "emfn-action-pack-plugin-$version.zip"
# build_plugin_zip "emfn-rich-search-plugin" "emfn-rich-search-plugin-$version.zip"