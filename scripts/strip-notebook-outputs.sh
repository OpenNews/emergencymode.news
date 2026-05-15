#!/usr/bin/env bash
set -euo pipefail

tmp_file=""

# Cleanup temporary files on exit or error
trap 'rm -f "${tmp_file:-}"' EXIT

if ! command -v jq >/dev/null 2>&1; then
  echo "Error: 'jq' is required but not installed. Please install jq (e.g., 'brew install jq' on macOS or 'sudo apt-get install jq' on Debian/Ubuntu)." >&2
  exit 1
fi
if [[ $# -gt 0 ]]; then
  notebooks=("$@")
else
  notebooks=(notebooks/*.ipynb)
fi

for notebook in "${notebooks[@]}"; do
  [[ -f "$notebook" ]] || continue

  tmp_file="$(mktemp)"
  jq '
    .cells |= map(
      if .cell_type == "code" then
        .execution_count = null
        | .outputs = []
        | .metadata = ((.metadata // {}) | del(.execution, .ExecuteTime, .collapsed, .scrolled))
      else
        .
      end
    )
  ' "$notebook" > "$tmp_file"

  mv "$tmp_file" "$notebook"
  tmp_file=""
done
