# Copilot Instructions

This directory contains instruction files that customize GitHub Copilot agent behavior for this repository.

## What Are Instruction Files?

Instruction files (`.instructions.md`) provide context-specific guidance to GitHub Copilot agents. They define:

- **Coding standards** specific to this codebase (naming conventions, architectural patterns)
- **When to apply**: `applyTo` patterns match file paths where instructions are relevant
- **Tool restrictions**: Which operations are allowed/preferred for specific file types
- **Domain knowledge**: WordPress plugin patterns, EMFN-specific conventions, Newspack constraints

## Files in This Directory

### wordpress-plugin.instructions.md

**Purpose**: WordPress plugin development standards for EMFN

**Applies to**: `plugins/**/*.php`

**Key guidance**:
- Singleton pattern implementation (`get_instance()`)
- Version management (never manually edit version numbers)
- Asset enqueuing standards (CSS/JS with proper dependencies)
- WordPress coding standards (prefix functions/classes/hooks with `emfn_`)
- Newspack compatibility constraints

**When it activates**: When you create or edit PHP files in the `plugins/` directory, Copilot uses these instructions to enforce EMFN patterns.

## How Instruction Files Work

### applyTo Patterns

The `applyTo` field in YAML frontmatter uses glob patterns to match file paths:

```yaml
---
applyTo:
  - plugins/**/*.php
---
```

This instruction applies when working with any `.php` file under `plugins/` directory.

### Instruction Content

After the YAML frontmatter, the markdown content provides detailed guidance:
- Code examples showing correct patterns
- Explanations of why certain approaches are required
- Links to related documentation
- Common mistakes to avoid

### Multiple Instructions

If multiple instruction files match a file path, Copilot combines their guidance. More specific patterns take precedence.

## Creating New Instruction Files

**Before creating**: Read [AGENT.md](../../AGENT.md) to understand common AI behavioral patterns and release-ready code requirements. Instruction files should encode lessons learned to prevent repeating mistakes.

**When to create**:
- Repeating coding patterns across multiple files
- Domain-specific knowledge (API integration, deployment constraints)
- File-type-specific workflows (build scripts, configuration files)
- Patterns from AGENT.md that apply to specific file types (e.g., WordPress plugin singleton pattern)

**When NOT to create**:
- One-time fixes (use inline comments instead)
- General programming knowledge (Copilot already knows this)
- Project-wide patterns (use AGENT.md or CONTRIBUTING.md instead)

**Relationship to AGENT.md**:
- **AGENT.md** = Lessons learned from actual failures (exit code masking, version source of truth, test framework rules)
- **Instruction files** = Proactive guidance for specific file types (WordPress patterns, SASS builds, release scripts)
- **Workflow**: Review AGENT.md chronic patterns → identify file-type-specific rules → encode in instruction files with `applyTo` patterns

**Template**:

```markdown
---
description: "Brief description. Use when: [scenarios]."
applyTo:
  - path/pattern/**/*.ext
---

# Instruction Title

## Key Patterns

[Code examples and explanations]

## Common Mistakes

[What to avoid and why]

## References

- [Related documentation]
```

## Related Files

- **[AGENT.md](../../AGENT.md)**: Lessons learned about creating release-ready code, common AI mistakes
- **[CONTRIBUTING.md](../../CONTRIBUTING.md)**: Development workflow, code quality standards, testing practices
- **[.github/agents/](../agents/)**: Custom Copilot agent definitions (like EMFNAgent)

## Learn More

- [GitHub Copilot Instructions Documentation](https://docs.github.com/en/copilot/customizing-copilot/adding-custom-instructions-for-github-copilot)
- [Agent Customization](https://code.visualstudio.com/docs/copilot/copilot-customization)
