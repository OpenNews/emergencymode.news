#!/usr/bin/env bash

set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "Usage: $0 <version>" >&2
  exit 1
fi

version="$1"

if [[ ! "$version" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "Version must be semver in the form X.Y.Z" >&2
  exit 1
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

update_readme_changelog() {
  local file_path="$1"

  python3 - "$file_path" "$version" <<'PY'
from pathlib import Path
import sys

file_path = Path(sys.argv[1])
version = sys.argv[2]
text = file_path.read_text()
heading = f"= {version} ="

if heading in text:
    file_path.write_text(text)
    raise SystemExit(0)

marker = "== Changelog ==\n"
entry = f"{heading}\n* See GitHub release notes for this version\n"

if marker not in text:
    raise SystemExit(f"Missing changelog marker in {file_path}")

text = text.replace(marker, marker + "\n" + entry, 1)
file_path.write_text(text)
PY
}

update_json_version() {
  local file_path="$1"
  python3 - "$file_path" "$version" <<'PY'
from pathlib import Path
import json
import sys

file_path = Path(sys.argv[1])
version = sys.argv[2]
data = json.loads(file_path.read_text())
data['version'] = version
file_path.write_text(json.dumps(data, indent=2) + '\n')
PY
}

update_toml_version() {
  local file_path="$1"
  perl -0pi -e "s/(^version = \")[0-9]+\.[0-9]+\.[0-9]+(\")/\${1}$version\${2}/m;" "$file_path"
}

update_json_version "package.json"
update_toml_version "pyproject.toml"

update_php_plugin_version "plugins/emfn-action-pack-plugin/emfn-action-pack-plugin.php" "EMFN_ACTION_PACK_PLUGIN_VERSION"
update_readme_stable_tag "plugins/emfn-action-pack-plugin/readme.txt"
update_readme_changelog "plugins/emfn-action-pack-plugin/readme.txt"

# update_php_plugin_version "plugins/emfn-rich-search-plugin/emfn-rich-search-plugin.php" "EMFN_RICH_SEARCH_PLUGIN_VERSION"
# update_readme_stable_tag "plugins/emfn-rich-search-plugin/readme.txt"
# update_readme_changelog "plugins/emfn-rich-search-plugin/readme.txt"
