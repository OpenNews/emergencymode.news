# Custom Agents

This directory contains custom GitHub Copilot agents that provide specialized expertise for EMFN development.

## EMFNAgent

**Purpose**: WordPress plugin specialist for Emergency Mode news site development.

**When to use**:
- Creating or modifying WordPress plugins following EMFN patterns
- Building SASS components and CSS build systems
- Working with Newspack constraints (no child themes)
- Developing Action Pack quiz features
- Explaining Action Pack logic to journalists and data reporters

**How to invoke**:
```
@EMFNAgent how do I create a new EMFN plugin?
@EMFNAgent explain the Action Pack scoring system for editors
@EMFNAgent set up a SASS build for the site styles plugin
```

**Capabilities**:
- Knows EMFN singleton pattern requirements
- Understands Newspack hosting constraints
- Familiar with Action Pack encoding/decoding logic
- Can explain technical concepts to non-technical users
- Enforces EMFN version management standards

**When NOT to use**:
- General coding questions → use default Copilot
- Repository structure questions → use default Copilot or read AGENT.md
- Test infrastructure → use default Copilot
- Release workflow debugging → consult AGENT.md first

## File Format

Custom agents use YAML frontmatter with these fields:
- `name`: Agent identifier (must match filename without .agent.md)
- `description`: When and how to use this agent
- `argument-hint`: Suggested prompt format

The agent's knowledge and instructions follow the frontmatter in Markdown.
