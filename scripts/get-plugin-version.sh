#!/usr/bin/env bash
###############################################################################
# Get Plugin Version
#
# Extracts the current version from a WordPress plugin's main PHP file.
#
# Usage:
#   ./scripts/get-plugin-version.sh <plugin-name>
#
# Arguments:
#   plugin-name    Plugin directory name (e.g., emfn-action-pack-plugin)
#
# Output:
#   Version string (e.g., "0.3.1")
#
# Exit codes:
#   0 - Success
#   1 - Error (plugin not found, version not found)
###############################################################################

set -euo pipefail

# Script directory for potential helper sourcing
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Validate arguments
if [[ $# -ne 1 ]]; then
    echo "Usage: $0 <plugin-name>" >&2
    echo "Example: $0 emfn-action-pack-plugin" >&2
    exit 1
fi

PLUGIN_NAME="$1"
PLUGIN_DIR="$REPO_ROOT/plugins/$PLUGIN_NAME"
PLUGIN_FILE="$PLUGIN_DIR/$PLUGIN_NAME.php"

# Verify plugin directory exists
if [[ ! -d "$PLUGIN_DIR" ]]; then
    echo "Error: Plugin directory not found: $PLUGIN_DIR" >&2
    exit 1
fi

# Verify plugin file exists
if [[ ! -f "$PLUGIN_FILE" ]]; then
    echo "Error: Plugin file not found: $PLUGIN_FILE" >&2
    exit 1
fi

# Extract version from plugin header
# Format: " * Version:           0.3.1"
version=$(grep -E '^\s*\*\s*Version:' "$PLUGIN_FILE" | sed -E 's/^\s*\*\s*Version:\s*(.+)\s*$/\1/' | tr -d ' ')

if [[ -z "$version" ]]; then
    echo "Error: Version not found in $PLUGIN_FILE" >&2
    exit 1
fi

echo "$version"
