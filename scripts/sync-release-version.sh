#!/usr/bin/env bash

set -euo pipefail

# Parse arguments
FORCE_MODE=0
PLUGIN_NAME=""
version=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --force)
      FORCE_MODE=1
      shift
      ;;
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
      else
        echo "Error: Unexpected argument '$1'" >&2
        echo "Usage: $0 [--force] [--plugin <name>] <version>" >&2
        exit 1
      fi
      shift
      ;;
  esac
done

# Validate version argument before any checks
if [[ -z "$version" ]]; then
  echo "Usage: $0 [--force] [--plugin <name>] <version>" >&2
  echo "" >&2
  echo "Options:" >&2
  echo "  --force           Skip version jump safety check (for fixing version history issues)" >&2
  echo "  --plugin <name>   Only update specified plugin (e.g., emfn-action-pack-plugin)" >&2
  echo "" >&2
  echo "Examples:" >&2
  echo "  $0 --plugin emfn-action-pack-plugin 0.3.2" >&2
  echo "  $0 --plugin emfn-site-styles-plugin 0.1.1" >&2
  echo "  $0 --plugin emfn-action-pack-plugin 0.3.2-pre" >&2
  exit 1
fi

if [[ ! "$version" =~ ^[0-9]+\.[0-9]+\.[0-9]+(-pre)?$ ]]; then
  echo "Error: Version must be semver in the form X.Y.Z or X.Y.Z-pre" >&2
  echo "Example: $0 1.2.3 or $0 1.2.3-pre" >&2
  exit 1
fi

# Safeguard: Prevent absurdly high version numbers (likely a mistake)
# Strip -pre suffix for numeric validation
version_base="${version%-pre}"
IFS='.' read -r major minor patch <<< "$version_base"
if [[ $major -gt 10 || $minor -gt 99 || $patch -gt 99 ]]; then
  echo "Error: Version $version seems unrealistic (component too large)" >&2
  echo "Maximum allowed: 10.99.99" >&2
  exit 1
fi

# Safeguard: Check version isn't too far ahead of latest GitHub release
# Skip check if:
# - Running in GitHub Actions workflow (CI deployment)
# - --force flag passed (manual version history fixes)
# - --plugin flag specified (plugin-specific releases use plugin tags, not repo releases)
if [[ "$FORCE_MODE" -eq 0 && -z "${GITHUB_ACTIONS:-}" && -z "$PLUGIN_NAME" ]]; then
  echo "Checking version against latest GitHub release..." >&2
  
  # Try to get latest release tag from GitHub
  latest_release=""
  if command -v gh >/dev/null 2>&1; then
    latest_release=$(gh release list --limit 1 --json tagName --jq '.[0].tagName' 2>/dev/null || echo "")
  fi
  
  if [[ -n "$latest_release" ]]; then
    # Strip 'v' prefix if present
    latest_release="${latest_release#v}"
    
    # Parse latest release version
    if [[ "$latest_release" =~ ^([0-9]+)\.([0-9]+)\.([0-9]+) ]]; then
      latest_major="${BASH_REMATCH[1]}"
      # shellcheck disable=SC2034
      latest_minor="${BASH_REMATCH[2]}"
      # shellcheck disable=SC2034
      latest_patch="${BASH_REMATCH[3]}"
      
      # Parse requested version to get major component (format already validated above)
      # Strip -pre suffix for comparison
      version_for_comparison="${version%-pre}"
      [[ "$version_for_comparison" =~ ^([0-9]+)\.([0-9]+)\.([0-9]+)$ ]]
      requested_major="${BASH_REMATCH[1]}"
      
      # Check if major version jumped by more than 1
      major_jump=$((requested_major - latest_major))
      
      if [[ $major_jump -gt 1 ]]; then
        echo "" >&2
        echo "ERROR: Version jump too large!" >&2
        echo "  Latest release: $latest_release" >&2
        echo "  Requested version: $version" >&2
        echo "  Major version jumped by: $major_jump (max allowed: 1)" >&2
        echo "" >&2
        echo "This suggests a version leak from tests or configuration error." >&2
        echo "" >&2
        echo "To proceed anyway (fixing version history):" >&2
        echo "  $0 --force $version" >&2
        echo "" >&2
        echo "This check is skipped in GitHub Actions workflows." >&2
        exit 1
      elif [[ $major_jump -lt 0 ]]; then
        echo "" >&2
        echo "WARNING: Version downgrade detected!" >&2
        echo "  Latest release: $latest_release" >&2
        echo "  Requested version: $version" >&2
        echo "" >&2
        echo "To proceed anyway (fixing version history):" >&2
        echo "  $0 --force $version" >&2
        exit 1
      else
        echo "Version check passed: $version is valid increment from $latest_release" >&2
      fi
    else
      echo "Warning: Could not parse latest release version '$latest_release', skipping check" >&2
    fi
  else
    echo "Warning: Could not fetch latest GitHub release (gh CLI not available or no releases), skipping check" >&2
  fi
fi

repo_root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$repo_root"

update_php_plugin_version() {
  local file_path="$1"
  local constant_name="$2"

  perl -0pi -e "s/(\* Version:\s+)[0-9]+\.[0-9]+\.[0-9]+/\${1}$version/; s/(define\( '\Q${constant_name}\E', ')[0-9]+\.[0-9]+\.[0-9]+(' \);)/\${1}$version\${2}/;" "$file_path"
}

update_readme_stable_tag() {
  local file_path="$1"
  perl -0pi -e "s/(Stable tag:\s+)[0-9]+\.[0-9]+\.[0-9]+/\${1}$version/;" "$file_path"
}

# Plugin-specific version constants mapping
declare -A PLUGIN_CONSTANTS=(
  ["emfn-action-pack-plugin"]="EMFN_ACTION_PACK_PLUGIN_VERSION"
  ["emfn-site-styles-plugin"]="EMFN_SITE_STYLES_PLUGIN_VERSION"
)

# Update plugin files based on --plugin flag
if [[ -n "$PLUGIN_NAME" ]]; then
  # Plugin-specific mode: only update specified plugin
  
  # Validate plugin exists
  if [[ ! -d "plugins/$PLUGIN_NAME" ]]; then
    echo "Error: Plugin directory not found: plugins/$PLUGIN_NAME" >&2
    exit 1
  fi
  
  # Get version constant for this plugin
  version_constant="${PLUGIN_CONSTANTS[$PLUGIN_NAME]:-}"
  if [[ -z "$version_constant" ]]; then
    echo "Error: Unknown plugin '$PLUGIN_NAME' - no version constant defined" >&2
    echo "Known plugins: ${!PLUGIN_CONSTANTS[*]}" >&2
    exit 1
  fi
  
  echo "Updating $PLUGIN_NAME to version $version..." >&2
  update_php_plugin_version "plugins/$PLUGIN_NAME/$PLUGIN_NAME.php" "$version_constant"
  update_readme_stable_tag "plugins/$PLUGIN_NAME/readme.txt"
  echo "✓ Updated $PLUGIN_NAME" >&2
else
  # Legacy mode: update all plugins (for backwards compatibility)
  echo "Warning: No --plugin flag specified. This mode updates all plugins to the same version." >&2
  echo "For independent plugin releases, use: $0 --plugin <name> <version>" >&2
  echo "" >&2
  
  update_php_plugin_version "plugins/emfn-action-pack-plugin/emfn-action-pack-plugin.php" "EMFN_ACTION_PACK_PLUGIN_VERSION"
  update_readme_stable_tag "plugins/emfn-action-pack-plugin/readme.txt"
  
  update_php_plugin_version "plugins/emfn-site-styles-plugin/emfn-site-styles-plugin.php" "EMFN_SITE_STYLES_PLUGIN_VERSION"
  update_readme_stable_tag "plugins/emfn-site-styles-plugin/readme.txt"
  
  echo "✓ Updated all plugins" >&2
fi