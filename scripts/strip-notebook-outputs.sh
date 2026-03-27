#!/usr/bin/env bash
set -euo pipefail

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
done
