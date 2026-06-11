#!/usr/bin/env bash
###############################################################################
# Generate Version Matrix
#
# Generates a JSON matrix of plugins to release with their versions.
# Used by GitHub Actions matrix strategy for parallel plugin releases.
#
# Usage:
#   ./scripts/generate-version-matrix.sh <changed-plugins> <commit-message>
#
# Arguments:
#   changed-plugins    Space-separated list of plugin directory names
#                      Example: "emfn-action-pack-plugin emfn-site-styles-plugin"
#   commit-message     Commit message to check for version bump keywords
#                      ([major], [minor], or default patch)
#
# Output:
#   JSON array suitable for GitHub Actions matrix strategy
#   Example: {"plugin":[{"name":"emfn-action-pack-plugin","slug":"action-pack",...}]}
#
# Exit codes:
#   0 - Success
#   1 - Error
###############################################################################

set -euo pipefail

# Script directory for helper sourcing
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Validate arguments
if [[ $# -lt 2 ]]; then
    echo "Usage: $0 <changed-plugins> <commit-message>" >&2
    echo "Example: $0 'emfn-action-pack-plugin emfn-site-styles-plugin' 'feat: add new quiz [minor]'" >&2
    exit 1
fi

CHANGED_PLUGINS="$1"
COMMIT_MESSAGE="$2"

# Plugin slug mapping (directory name -> slug for git tags)
declare -A PLUGIN_SLUGS=(
    ["emfn-action-pack-plugin"]="action-pack"
    ["emfn-site-styles-plugin"]="site-styles"
)

# Change to repo root
cd "$REPO_ROOT"

# Function to get latest plugin version from git tags
get_latest_plugin_version() {
    local plugin_slug="$1"
    local latest_tag
    
    # Get latest tag for this plugin (format: plugin-slug/vX.Y.Z)
    latest_tag=$(git tag --list "${plugin_slug}/v[0-9]*.[0-9]*.[0-9]*" --sort=-version:refname | head -n1)
    
    if [[ -z "$latest_tag" ]]; then
        # No tags exist for this plugin yet
        echo "0.0.0"
    else
        # Extract version from tag (remove plugin-slug/v prefix)
        echo "${latest_tag#"${plugin_slug}"/v}"
    fi
}

# Function to calculate next version based on commit message
calculate_next_version() {
    local current_version="$1"
    local commit_msg="$2"
    
    # Parse current version
    IFS='.' read -r major minor patch <<< "$current_version"
    
    # Check commit message for version bump signals
    if echo "$commit_msg" | grep -qiE '\[major\]|(^|[^[:alnum:]_])major([^[:alnum:]_]|$)'; then
        # Major bump: x.0.0
        major=$((major + 1))
        minor=0
        patch=0
    elif echo "$commit_msg" | grep -qiE '\[minor\]|(^|[^[:alnum:]_])minor([^[:alnum:]_]|$)'; then
        # Minor bump: x.y.0
        minor=$((minor + 1))
        patch=0
    else
        # Default: patch bump x.y.z
        patch=$((patch + 1))
    fi
    
    echo "${major}.${minor}.${patch}"
}

# Build JSON array
plugins_json="["
first=true

for plugin_name in $CHANGED_PLUGINS; do
    # Get plugin slug
    plugin_slug="${PLUGIN_SLUGS[$plugin_name]:-}"
    
    if [[ -z "$plugin_slug" ]]; then
        echo "Error: Unknown plugin '$plugin_name' - no slug mapping defined" >&2
        exit 1
    fi
    
    # Get current and next versions
    current_version=$(get_latest_plugin_version "$plugin_slug")
    next_version=$(calculate_next_version "$current_version" "$COMMIT_MESSAGE")
    tag="${plugin_slug}/v${next_version}"
    
    # Add to JSON array
    if [[ "$first" = true ]]; then
        first=false
    else
        plugins_json+=","
    fi
    
    plugins_json+="{\"name\":\"$plugin_name\",\"slug\":\"$plugin_slug\",\"current_version\":\"$current_version\",\"next_version\":\"$next_version\",\"tag\":\"$tag\"}"
done

plugins_json+="]"

# Output complete JSON object
echo "{\"plugin\":$plugins_json}"
