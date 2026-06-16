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
#                      ([major], [minor], [pre], or default patch)
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

# Function to get current plugin version from plugin file
get_current_plugin_version() {
    local plugin_name="$1"
    
    # Use get-plugin-version.sh to read version from plugin file
    "$REPO_ROOT/scripts/get-plugin-version.sh" "$plugin_name"
}

# Function to calculate next version based on commit message
calculate_next_version() {
    local current_version="$1"
    local commit_msg="$2"
    
    # Parse current version (strip any -pre suffix if present)
    current_version="${current_version%-pre}"
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
    
    # Check for pre-release flag and add suffix
    if echo "$commit_msg" | grep -qiE '\[pre(release)?\]'; then
        echo "${major}.${minor}.${patch}-pre"
    else
        echo "${major}.${minor}.${patch}"
    fi
}

# Function to detect pre-release flag in commit message
is_prerelease() {
    local commit_msg="$1"
    
    if echo "$commit_msg" | grep -qiE '\[pre(release)?\]'; then
        echo "true"
    else
        echo "false"
    fi
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
    current_version=$(get_current_plugin_version "$plugin_name")
    next_version=$(calculate_next_version "$current_version" "$COMMIT_MESSAGE")
    prerelease=$(is_prerelease "$COMMIT_MESSAGE")
    tag="${plugin_slug}/v${next_version}"
    
    # Add to JSON array
    if [[ "$first" = true ]]; then
        first=false
    else
        plugins_json+=","
    fi
    
    plugins_json+="{\"name\":\"$plugin_name\",\"slug\":\"$plugin_slug\",\"current_version\":\"$current_version\",\"next_version\":\"$next_version\",\"tag\":\"$tag\",\"prerelease\":$prerelease}"
done

plugins_json+="]"

# Output complete JSON object
echo "{\"plugin\":$plugins_json}"
