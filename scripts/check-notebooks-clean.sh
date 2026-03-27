#!/usr/bin/env bash
set -euo pipefail

if ! command -v jq &> /dev/null; then
  echo "jq is required but not installed. Install it with: apt-get update && apt-get install -y jq"
  exit 1
fi

if [[ $# -gt 0 ]]; then
  notebooks=("$@")
else
  notebooks=(notebooks/*.ipynb)
fi

failed=0

for notebook in "${notebooks[@]}"; do
  [[ -f "$notebook" ]] || continue

  has_executed_state="$(jq '
    [
      .cells[]
      | select(.cell_type == "code")
      | select(
          (.execution_count != null)
          or ((.outputs // []) | length > 0)
          or (((.metadata // {}) | (has("execution") or has("ExecuteTime") or has("collapsed") or has("scrolled"))))
      )
    ]
    | length > 0
  ' "$notebook")"

  if [[ "$has_executed_state" == "true" ]]; then
    echo "Notebook contains executed state: $notebook"
    failed=1
  fi
done

if [[ $failed -eq 1 ]]; then
  printf '\nRun scripts/strip-notebook-outputs.sh and commit the cleaned notebooks.\n'
  exit 1
fi

echo "All notebooks are clean (unexecuted state)."
