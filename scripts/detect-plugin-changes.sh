#!/usr/bin/env bash
###############################################################################
# Detect Plugin Changes
#
# Detects which plugins have file changes between a base ref and HEAD.
#
# Usage:
#   ./scripts/detect-plugin-changes.sh [base-ref]
#
# Arguments:
#   base-ref    Git reference to compare against (default: origin/main)
#
# Output:
#   Space-separated list of changed plugin directory names
#   Example: "emfn-action-pack-plugin emfn-site-styles-plugin"
#
# Exit codes:
#   0 - Success (changes found or not found)
#   1 - Error (invalid git reference, etc.)
###############################################################################

set -euo pipefail

# Script directory for potential helper sourcing
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Base reference to compare against
BASE_REF="${1:-origin/main}"

# Change to repo root
cd "$REPO_ROOT"

# Verify base ref exists
if ! git rev-parse --verify "$BASE_REF" >/dev/null 2>&1; then
    echo "Error: Git reference '$BASE_REF' does not exist" >&2
    exit 1
fi

# Get changed files in plugins/ directory
# - Compare BASE_REF to HEAD
# - Extract plugin directory names (2nd path component)
# - Filter out 'shared' (not a releasable plugin)
# - Sort and deduplicate
changed_plugins=$(
    git diff --name-only "${BASE_REF}..HEAD" -- plugins/ \
        | cut -d/ -f2 \
        | grep -v '^shared$' \
        | sort -u \
        | tr '\n' ' ' \
        | sed 's/ $//'
)

# Output result (may be empty string if no changes)
echo "$changed_plugins"
