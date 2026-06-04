# Multi-Plugin Release Strategy Implementation Plan

## Executive Summary

**Goal**: Enable independent versioning and selective releases for WordPress plugins.

**Strategy**: Plugin-only versioning with git tags
- **Plugin tags** (`action-pack/v0.3.2`, `site-styles/v0.1.0`): Individual plugin releases
- **No repository tags**: No more monolithic `v1.2.3` tags
- **No version files**: No version in package.json or pyproject.toml

**Release flow**:
1. Detect which plugins changed in PR to main
2. For each changed plugin, calculate next version (commit message keywords)
3. **Parallel**: Update plugin files, build ZIPs, create plugin releases

**Impact**: ~6 new/modified scripts, major workflow refactor, ~15-18 hours development

---

## Context

The EMFN project now has **two WordPress plugins**:
- `emfn-action-pack-plugin` (existing, v0.3.1)
- `emfn-site-styles-plugin` (new, v0.1.0)

**Current behavior**: Release workflow versions all files together using a single monolithic version.

**Required behavior**: 
- Each plugin versions independently
- Only plugins with changes in the PR should be released
- No repository-wide version (unnecessary churn)
- package.json and pyproject.toml should NOT have version fields

---

## Current State Analysis

### Workflow Structure
- **release.yml**: Single version bump based on commit message keywords ([major], [minor], or patch)
- **sync-release-version.sh**: Updates version in multiple files (package.json, pyproject.toml, plugin files)
- **build-release-assets.sh**: Builds ZIP files for plugins
- Version controlled via git tags (e.g., `v1.2.3`)

### Problems
1. ✗ Single version number for entire repo (monolithic)
2. ✗ No per-plugin versioning
3. ✗ No change detection (always releases everything)
4. ✗ Both plugins would have same version number
5. ✗ No way to release only changed plugins
6. ✗ package.json and pyproject.toml have version fields (unnecessary)
7. ✗ Creates repo-level releases even when only docs/tests change

---

## Implementation Strategy

### Approach: **Plugin-Only Versioning**

**Plugin-specific versions** (the only versions):
- `action-pack/v0.3.2`, `action-pack/v0.4.0`, etc.
- `site-styles/v0.1.1`, `site-styles/v0.2.0`, etc.
- Only created for plugins with changes in the PR
- Each plugin evolves at its own pace
- No releases when only non-plugin files change (docs, tests, notebooks, etc.)

**No repository-level versioning**:
- No `v1.2.3` style tags (pointless churn)
- Repository state tracked via commit SHAs and plugin tags
- No monolithic releases

**No versions in package.json/pyproject.toml**:
- Remove `"version"` field from package.json
- Remove `version` field from pyproject.toml
- Version only exists for WordPress plugins (in git tags and plugin PHP files)

---

## Workflow Visualization

```
PR merged to main
    │
    ├─► Detect changed plugins
    │   └─ git diff main..HEAD -- plugins/
    │
    ├─► Any plugins changed?
    │   ├─ NO  → Exit (no release)
    │   └─ YES → Continue
    │
    └─► Generate plugin matrix
        ├─ action-pack: v0.3.1 → v0.3.2
        └─ site-styles: v0.1.0 → v0.1.1

        ┌─────────────────────────────────┐
        │  Parallel Matrix Jobs (plugins) │
        └─────────────────────────────────┘
                 │
        ┌────────┴────────┐
        ▼                 ▼
   action-pack      site-styles
        │                 │
        ├─ Update version files
        ├─ Commit changes
        ├─ Build ZIP
        └─ Create release
           ├─ Tag: action-pack/v0.3.2
           └─ Upload ZIP asset
                            │
           ├─ Tag: site-styles/v0.1.1
           └─ Upload ZIP asset

   DONE ✓
```

**Key Points**:
- No repository-level release (simplified)
- Plugin releases are independent (parallel matrix)
- If no plugins changed (only docs/tests), workflow skips release
- Each plugin gets its own GitHub release

---

## Tag Naming Conventions

### Plugin Tags
- **Format**: `{plugin-slug}/v{major}.{minor}.{patch}`
- **Examples**: 
  - `action-pack/v0.3.2`
  - `site-styles/v0.1.0`
- **Purpose**: Represents specific plugin release
- **Query**: 
  - All plugin tags: `git tag --list '*/v*'`
  - Specific plugin: `git tag --list 'action-pack/v*'`

### Tag Listing Examples

```bash
# Get latest action-pack version
git tag --list 'action-pack/v[0-9]*.[0-9]*.[0-9]*' --sort=-version:refname | head -n1
# Output: action-pack/v0.3.2

# Get latest site-styles version
git tag --list 'site-styles/v[0-9]*.[0-9]*.[0-9]*' --sort=-version:refname | head -n1
# Output: site-styles/v0.1.0

# List all plugin releases
git tag --list '*/v*' --sort=-version:refname
# Output:
#   action-pack/v0.3.2
#   site-styles/v0.1.0
#   action-pack/v0.3.1
#   ...
```

---

## Detailed Implementation Plan

### Phase 0: Remove Versions from Package Files

**Action**: Remove version fields from package.json and pyproject.toml

**package.json changes**:
```diff
 {
   "name": "emergencymode-news",
-  "version": "0.3.1",
   "type": "module",
```

**pyproject.toml changes**:
```diff
 [project]
 name = "emergencymode-disaster-risk"
 description = "Disaster risk projection data analysis for Emergency Mode News"
-version = "0.3.1"
 requires-python = ">=3.13"
```

**Rationale**: Version management moves entirely to git tags. Package files no longer track version numbers.

---

### Phase 1: Plugin Change Detection Script

**Create**: `scripts/detect-plugin-changes.sh`

**Purpose**: Detect which plugins have file changes between main and current branch

```bash
#!/usr/bin/env bash
# Usage: ./scripts/detect-plugin-changes.sh [base-ref]
# Output: Space-separated list of changed plugin directory names
# Example output: "emfn-action-pack-plugin emfn-site-styles-plugin"

# Compares current HEAD against base-ref (default: origin/main)
# Checks for A/M/D files in plugins/*/
# Outputs only the plugin directory names that changed
```

**Logic**:
```bash
git diff --name-status ${base_ref}..HEAD -- plugins/ \
  | grep '^[AMD]' \
  | cut -f2 \
  | cut -d/ -f2 \
  | sort -u
```

---

### Phase 2: Plugin Change Detection Script

**Create**: `scripts/detect-plugin-changes.sh`

**Purpose**: Detect which plugins have file changes between main and current branch

```bash
#!/usr/bin/env bash
# Usage: ./scripts/detect-plugin-changes.sh [base-ref]
# Output: Space-separated list of changed plugin directory names
# Example output: "emfn-action-pack-plugin emfn-site-styles-plugin"

# Compares current HEAD against base-ref (default: origin/main)
# Checks for A/M/D files in plugins/*/
# Outputs only the plugin directory names that changed
```

**Logic**:
```bash
git diff --name-status ${base_ref}..HEAD -- plugins/ \
  | grep '^[AMD]' \
  | cut -f2 \
  | cut -d/ -f2 \
  | sort -u
```

---

### Phase 2: Plugin Version Extraction Script

**Create**: `scripts/get-plugin-version.sh <plugin-name>`

**Purpose**: Extract current version from plugin's main PHP file

```bash
# Example: ./scripts/get-plugin-version.sh emfn-action-pack-plugin
# Output: 0.3.1
```

**Logic**: Parse `Version:` header from `plugins/<plugin-name>/<plugin-name>.php`

---

### Phase 3: Version Matrix Generation Script

**Create**: `scripts/generate-version-matrix.sh`

**Purpose**: Generate JSON matrix of plugins to release with their versions

```bash
# Usage: ./scripts/generate-version-matrix.sh <changed-plugins> <commit-message>
# Output: JSON array for GitHub Actions matrix
```

**Logic**:
- For each plugin in `<changed-plugins>`:
  - Get latest plugin tag (e.g., `action-pack/v0.3.1`)
  - Calculate next version based on commit message keywords
  - Add to JSON array

**Output example**:
```json
{
  "plugin": [
    {
      "name": "emfn-action-pack-plugin",
      "slug": "action-pack",
      "current_version": "0.3.1",
      "next_version": "0.3.2",
      "tag": "action-pack/v0.3.2"
    }
  ]
}
```

---

### Phase 4: Update `sync-release-version.sh`

**Changes**:
- Add `--plugin <name>` flag to target specific plugin
- **Remove** version updates for package.json and pyproject.toml (no longer versioned)
- When `--plugin` specified, only update that plugin's files:
  - `plugins/<plugin>/<plugin>.php` - Plugin header + constant
  - `plugins/<plugin>/readme.txt` - Stable tag

**Signature**:
```bash
./scripts/sync-release-version.sh --plugin <name> <version>
```

**Examples**:
```bash
# Update action-pack plugin to 0.3.2
./scripts/sync-release-version.sh --plugin emfn-action-pack-plugin 0.3.2

# Update site-styles plugin to 0.1.1
./scripts/sync-release-version.sh --plugin emfn-site-styles-plugin 0.1.1
```

**Note**: No repo-level file versioning - package.json/pyproject.toml no longer have version fields.

---

### Phase 5: Update `build-release-assets.sh`

**Changes**:
- Add `--plugin <name>` flag to build only specific plugin
- When flag provided, only build that plugin's ZIP
- Keep existing behavior (build all) when no flag

**Signature**:
```bash
./scripts/build-release-assets.sh [--plugin <name>] <version> <output-dir>
```

**Examples**:
```bash
# Build only action-pack plugin
./scripts/build-release-assets.sh --plugin emfn-action-pack-plugin 0.3.2 dist

# Build all plugins (legacy)
./scripts/build-release-assets.sh 1.0.0 dist
```

---

### Phase 6: Update `release.yml` Workflow

**Major Changes**:

#### 6.1 Detect Changed Plugins
```yaml
- name: Detect changed plugins
  id: detect
  run: |
    changed_plugins=$(./scripts/detect-plugin-changes.sh origin/main)
    echo "changed_plugins=$changed_plugins" >> "$GITHUB_OUTPUT"
    
    if [[ -z "$changed_plugins" ]]; then
      echo "No plugin changes detected - skipping release"
    else
      echo "Changed plugins: $changed_plugins"
    fi
```

#### 6.2 Generate Plugin Version Matrix
```yaml
- name: Generate plugin version matrix
  id: versions
  if: steps.detect.outputs.changed_plugins != ''
  env:
    COMMIT_MESSAGE: ${{ github.event.head_commit.message }}
  run: |
    # For each changed plugin:
    # 1. Get latest plugin-specific tag (e.g., action-pack/v0.3.1)
    # 2. Calculate next version using commit message keywords
    # 3. Output JSON array for matrix strategy
    
    ./scripts/generate-version-matrix.sh \
      "${{ steps.detect.outputs.changed_plugins }}" \
      "$COMMIT_MESSAGE" \
      > matrix.json
    
    echo "matrix=$(cat matrix.json)" >> "$GITHUB_OUTPUT"
```

**Matrix output example**:
```json
{
  "plugin": [
    {
      "name": "emfn-action-pack-plugin",
      "slug": "action-pack",
      "current_version": "0.3.1",
      "next_version": "0.3.2",
      "tag": "action-pack/v0.3.2"
    },
    {
      "name": "emfn-site-styles-plugin",
      "slug": "site-styles",
      "current_version": "0.1.0",
      "next_version": "0.1.1",
      "tag": "site-styles/v0.1.1"
    }
  ]
}
```

#### 6.3 Update Plugin Versions and Build (Matrix Strategy)
```yaml
jobs:
  release:
    runs-on: ubuntu-latest
    if: github.event_name == 'workflow_dispatch' || !contains(github.event.head_commit.message || '', '[skip ci]')
    outputs:
      changed_plugins: ${{ steps.detect.outputs.changed_plugins }}
      matrix: ${{ steps.versions.outputs.matrix }}
    
    steps:
      - name: Validate RELEASE_TOKEN
        run: |
          if [[ -z "${{ secrets.RELEASE_TOKEN }}" ]]; then
            echo "::error::RELEASE_TOKEN secret is not configured"
            echo "This token is required to bypass branch protection when committing version changes."
            echo "Please configure RELEASE_TOKEN in repository secrets."
            exit 1
          fi
      
      # ... setup, tests, detect, matrix steps ...
  
  release-plugins:
    needs: release
    if: needs.release.outputs.changed_plugins != ''
    runs-on: ubuntu-latest
    strategy:
      matrix: ${{ fromJson(needs.release.outputs.matrix) }}
    
    steps:
      - name: Checkout
        uses: actions/checkout@v6
        with:
          token: ${{ secrets.RELEASE_TOKEN }}
      
      - name: Sync plugin version
        run: |
          ./scripts/sync-release-version.sh \
            --plugin ${{ matrix.plugin.name }} \
            ${{ matrix.plugin.next_version }}
      
      - name: Commit version changes
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add plugins/${{ matrix.plugin.name }}/
          git commit -m "chore(${{ matrix.plugin.slug }}): Release ${{ matrix.plugin.next_version }} [skip ci]"
          git pull --rebase origin main
          git push
      
      - name: Build plugin ZIP
        run: |
          ./scripts/build-release-assets.sh \
            --plugin ${{ matrix.plugin.name }} \
            ${{ matrix.plugin.next_version }} \
            dist
      
      - name: Create plugin release
        uses: softprops/action-gh-release@v3
        with:
          tag_name: ${{ matrix.plugin.tag }}
          name: "${{ matrix.plugin.slug }} ${{ matrix.plugin.next_version }}"
          body: "Release for ${{ matrix.plugin.name }}"
          files: |
            dist/${{ matrix.plugin.name }}-${{ matrix.plugin.next_version }}.zip
```

---

### Phase 7: Update Tests

**New test files needed**:

1. **`tests/scripts/test-detect-changes.sh`**
   - Test git diff detection logic
   - Test no changes scenario
   - Test single/multiple plugin changes

2. **`tests/scripts/test-get-plugin-version.sh`**
   - Test version extraction from PHP files
   - Test invalid plugin name handling

3. **Update `test-sync-version.sh`**
   - Add tests for `--plugin` flag
   - Test both plugin-scoped and repo-scoped versioning

4. **Update `test-build-assets.sh`**
   - Add tests for `--plugin` flag
   - Test building single plugin vs all plugins

**Note on lock files**: 
- `package-lock.json` and `uv.lock` are still regenerated in workflow
- They just won't sync version changes (since there are no versions to sync)
- This ensures dependencies stay up-to-date

---

## Migration Path

### For This PR (staging → main)
**Both plugins have changes**, so the release will create:

**Plugin releases**:
- `action-pack/v0.3.2` (has modifications)
- `site-styles/v0.1.0` (new plugin - first release)

**File changes**:
- Remove `"version": "0.3.1"` from package.json
- Remove `version = "0.3.1"` from pyproject.toml

**No repository-level release**: Only plugin-specific releases are created.

---

## File Change Summary

### New Files
- `scripts/detect-plugin-changes.sh`
- `scripts/get-plugin-version.sh`
- `scripts/generate-version-matrix.sh`
- `tests/scripts/test-detect-changes.sh`
- `tests/scripts/test-get-plugin-version.sh`

### Modified Files
- `.github/workflows/release.yml` (major refactor - plugin-only versioning)
- `scripts/sync-release-version.sh` (add --plugin flag, remove package.json/pyproject.toml updates)
- `scripts/build-release-assets.sh` (add --plugin flag)
- `package.json` (remove version field)
- `pyproject.toml` (remove version field)
- `tests/scripts/test-sync-version.sh` (add plugin tests, remove repo file tests)
- `tests/scripts/test-build-assets.sh` (add plugin tests)

### Unchanged
- Plugin structure (no changes to plugin files themselves)
- Version format (still semver x.y.z)
- Commit message keywords ([major], [minor], default patch)
- Test infrastructure (Jest, PHPUnit, shell script tests)

---

## Prerequisites

Before implementing this plan:

- [x] `RELEASE_TOKEN` secret configured in repository (has bypass permissions for branch protection)
- [ ] Branch protection rules configured on `main` branch
- [ ] Verify `RELEASE_TOKEN` is from GitHub App or admin PAT with bypass permissions

**Note**: Issue #21 tracks the branch protection setup.

---

## Rollout Checklist

- [ ] Remove version from package.json
- [ ] Remove version from pyproject.toml
- [ ] Create detect-plugin-changes.sh script
- [ ] Create get-plugin-version.sh script
- [ ] Create generate-version-matrix.sh script
- [ ] Update sync-release-version.sh (add --plugin flag, remove package.json/pyproject.toml)
- [ ] Update build-release-assets.sh (add --plugin flag)
- [ ] Write tests for new scripts
- [ ] Update existing tests (remove package.json/pyproject.toml assertions)
- [ ] Update release.yml workflow (plugin-only versioning)
- [ ] Remove old version bump logic from workflow
- [ ] Test workflow locally with act/gh CLI
- [ ] Document plugin-tagging convention in README
- [ ] Create PR with changes
- [ ] Verify first multi-plugin release works

---

## Benefits

✓ **Plugin-only versioning**: Only release what changed
✓ **No unnecessary churn**: No repo-level tags when only plugins change
✓ **Independent plugin evolution**: Each plugin evolves at its own pace
✓ **Selective releases**: Only changed plugins get new versions
✓ **Clear attribution**: Tags show exactly which plugin was released
✓ **No package file pollution**: Versions live in git tags and plugin PHP files only
✓ **Parallel releases**: Plugins release simultaneously via matrix strategy
✓ **Skip releases intelligently**: No releases when only docs/tests/notebooks change
✓ **Testable**: Each script is isolated and testable
✓ **Scalable**: Adding new plugins requires no workflow changes

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Plugin tags could be confusing | Clear naming: `<slug>/v<version>`, document in README |
| Matrix jobs failing independently | Add failure handling, continue-on-error for plugin releases |
| Version conflicts during concurrent merges | Rebase logic in workflow prevents conflicts |
| No version in package files breaks tooling | Update any scripts that read package.json version to use git tags |
| No way to track "repo state" | Use commit SHAs and plugin tags; if needed, can add later |
| Parallel commits causing tag conflicts | Use git pull --rebase and retry logic |
| Silent skips when no plugins change | Log clearly when skipping release |
| RELEASE_TOKEN deleted/missing | Validate token exists early in workflow with clear error message |
| Branch protection blocks commits | RELEASE_TOKEN must have bypass permissions (see Prerequisites) |

---

## Timeline Estimate

- **Phase 0** (Remove package versions): 15 min
- **Phase 1** (Plugin change detection): 1-2 hours
- **Phase 2** (Version extraction): 1 hour
- **Phase 3** (Matrix generation): 2-3 hours
- **Phase 4** (Update sync script): 2-3 hours
- **Phase 5** (Update build script): 1-2 hours
- **Phase 6** (Workflow refactor): 3-5 hours
- **Phase 7** (Tests): 2-3 hours
- **Testing & refinement**: 2-3 hours

**Total**: ~15-20 hours of focused development

---

## Alternative Approaches Considered

### ❌ Monorepo with Lerna/Changesets
- **Pros**: Industry-standard tooling, automatic changelog generation
- **Cons**: Heavy npm dependencies, npm-focused, overkill for 2 WordPress plugins
- **Decision**: Too complex for our needs

### ❌ Separate repos per plugin
- **Pros**: Complete isolation, simpler per-repo CI
- **Cons**: Harder to maintain shared code/types, CI duplication, splits project unnecessarily
- **Decision**: Shared code benefits outweigh isolation benefits

### ❌ Manual versioning (no automation)
- **Pros**: Simple, no workflow complexity, full control
- **Cons**: Error-prone, doesn't scale, easy to forget steps
- **Decision**: Automation prevents mistakes

### ❌ Single monolithic version for everything
- **Pros**: Simplest possible approach
- **Cons**: Forces version bumps on unchanged plugins, conflates plugin releases with codebase changes
- **Decision**: Current broken state we're replacing

### ❌ Repository version + plugin versions (dual)
- **Pros**: Tracks both repo state and plugin releases
- **Cons**: Unnecessary churn - creates repo tags even when only plugins change, adds complexity
- **Decision**: Overkill - repository state can be tracked via commit SHA

### ✅ Plugin-only versioning (CHOSEN)
- **Pros**: Minimal, focused, only versions what matters (WordPress plugins)
- **Cons**: No explicit "repository version" (but commit SHA serves this purpose)
- **Decision**: Simplest approach that solves the problem without extra complexity

---

## Design Decisions (Finalized)

1. ✓ **package.json/pyproject.toml versioning**: REMOVED - versions live in git tags only
2. ✓ **Repository version**: NO - removed to avoid unnecessary churn
3. ✓ **PR labels for version bumps**: NO - commit message keywords only
4. ✓ **Breaking changes across plugins**: SKIP for now (not likely)
5. ✓ **Release strategy**: PARALLEL via GitHub Actions matrix
6. ✓ **Release triggers**: Only when plugin files change (skip for docs/tests/notebooks)

---

**Status**: PLANNING COMPLETE - Ready for implementation

**Plan Revision**: v3 (simplified to plugin-only versioning)

**Key Simplifications from v2**:
- ✗ Removed repository-level version tags (unnecessary churn)
- ✗ Removed calculate-repo-version.sh script (no longer needed)
- ✓ Simplified workflow - only releases when plugins change
- ✓ Reduced complexity - one versioning system instead of two

**Next Steps**: 
1. Review and approve this simplified plan
2. Begin Phase 0 (remove package versions)
3. Implement phases sequentially with tests
4. Test workflow with staging branch
5. Deploy to production on main merge

**Questions or concerns?** Review the "Design Decisions" section and workflow visualization above.
