#!/usr/bin/env bash
###############################################################################
# Build Local Release
#
# Builds, on your machine only, the plugin ZIP that merging to main would release,
# with `.alpha` added to the version. Use it to try the upcoming release on the
# site by hand before the PR merges.
#
# The version comes from the same rule as the real release
# (scripts/generate-version-matrix.sh): current version + a patch bump, or a
# minor/major bump if you pass one (match the [minor]/[major] you'll put in the
# merge message). Example: site-styles 0.4.0 -> 0.4.1.alpha.
#
# Nothing in the repo changes: the version is written into a temporary copy of
# the plugin, and no commits or tags are made.
#
# Usage:
#   ./scripts/build-local-release.sh <plugin-name> [patch|minor|major]
#
# Output:
#   release/<plugin-name>-<next-version>.alpha.zip (RELEASE_DIR overrides the folder)
###############################################################################

set -euo pipefail

usage() {
  echo "Usage: $0 <plugin-name> [patch|minor|major]" >&2
  echo "" >&2
  echo "Examples:" >&2
  echo "  npm run release:site-styles            # 0.4.0 -> 0.4.1.alpha" >&2
  echo "  npm run release:site-styles -- minor   # 0.4.0 -> 0.5.0.alpha" >&2
}

plugin_name="${1:-}"
bump="${2:-patch}"

if [[ -z "$plugin_name" || $# -gt 2 ]]; then
  usage
  exit 1
fi

case "$bump" in
  patch) commit_message="" ;;
  minor | major) commit_message="[$bump]" ;;
  *)
    echo "Error: bump must be patch, minor or major, got '$bump'" >&2
    exit 1
    ;;
esac

repo_root="$(cd "$(dirname "$0")/.." && pwd)"
plugin_src="$repo_root/plugins/$plugin_name"
release_dir="${RELEASE_DIR:-$repo_root/release}"

if [[ ! -f "$plugin_src/$plugin_name.php" ]]; then
  echo "Error: Plugin not found: plugins/$plugin_name/$plugin_name.php" >&2
  exit 1
fi

# Ask the release workflow's own script what it would release
matrix="$("$repo_root/scripts/generate-version-matrix.sh" "$plugin_name" "$commit_message")"
current_version="$(echo "$matrix" | sed -E 's/.*"current_version":"([^"]+)".*/\1/')"
next_version="$(echo "$matrix" | sed -E 's/.*"next_version":"([^"]+)".*/\1/')"
if [[ ! "$next_version" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "Error: Could not work out the next version (got '$next_version')" >&2
  exit 1
fi

version="$next_version.alpha"
# e.g. emfn-site-styles-plugin -> EMFN_SITE_STYLES_PLUGIN_VERSION
version_constant="$(echo "$plugin_name" | tr '[:lower:]-' '[:upper:]_')_VERSION"

work_dir="$(mktemp -d)"
trap 'rm -rf "$work_dir"' EXIT

cp -R "$plugin_src" "$work_dir/$plugin_name"
plugin_php="$work_dir/$plugin_name/$plugin_name.php"
readme="$work_dir/$plugin_name/readme.txt"

VERSION="$version" CONSTANT="$version_constant" perl -0pi -e '
  s/(\* Version:\s+)\S+/${1}$ENV{VERSION}/;
  s/(define\(\s*'\''\Q$ENV{CONSTANT}\E'\'',\s*'\'')[^'\'']+('\'')/${1}$ENV{VERSION}${2}/;
' "$plugin_php"

if [[ -f "$readme" ]]; then
  VERSION="$version" perl -0pi -e 's/(Stable tag:\s+)\S+/${1}$ENV{VERSION}/;' "$readme"
fi

# Stop if either version line didn't get updated (e.g. the file format changed)
if ! grep -qE "^\s*\* Version:\s+${version//./\\.}\s*$" "$plugin_php"; then
  echo "Error: Could not set the Version header in $plugin_name.php" >&2
  exit 1
fi
if ! grep -qF "define( '$version_constant', '$version' );" "$plugin_php"; then
  echo "Error: Could not set $version_constant in $plugin_name.php" >&2
  exit 1
fi

mkdir -p "$release_dir"
archive="$release_dir/$plugin_name-$version.zip"
rm -f "$archive"

# Same layout as the real release ZIP: the plugin folder at the top level
(cd "$work_dir" && zip -qr "$archive" "$plugin_name")

echo "✓ $plugin_name $current_version -> $version: ${archive#"$repo_root"/}" >&2
