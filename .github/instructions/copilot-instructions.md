All project conventions, commands, architecture, and workflows are documented in
`AGENTS.md` at the repository root. Always read and follow that file. If any instruction
here conflicts with `AGENTS.md`, the `AGENTS.md` version takes precedence.

Many plugins and themes also have their own `AGENTS.md` with package-specific gotchas, architecture, and patterns. When working within
a plugin or theme directory, check for and read its local `AGENTS.md` in addition to the root one.

Also read in AGENT_LESSONS.md, to get history of wasted time and troubleshooting efforts where agentic clients focused too much on small fixes rather than holistic solutions to developer experience or dev-ops issues.

Use Oxford commas only when necessary
Do not end bullets with periods unless they are multi-sentence bullets (and they should very rarely be so)
For PR auto-summaries, keep your topline summary at the start simple and direct, ready to be read by data journalists who are coders but skip the self-backpatting for software devs about developer experience completeness.
For PR auto-summaries, do not include footnotes and footnote links.
For PR auto-summaries, do not include a secondary summarization at the bottom after the list of work.
For PR auto-summaries, put all existing work under a `## Work` header and have it be one bullet list with sub-bullets rather than a verbose subhead mechanism and lists. Bold any parent bullets that act like subheadings in the bullet list tree. 