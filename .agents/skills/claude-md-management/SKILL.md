---
name: claude-md-management
description: Audit and update AGENTS.md and other project memory files to keep them aligned with the actual codebase. Use when the user asks to "audit AGENTS.md", "update project rules", "check if docs are up to date", or at the end of a session to capture learnings.
---

# AGENTS.md Management

Two complementary tools: **audit** (codebase → docs sync) and **capture** (session learnings → docs).

---

## Tool 1: Audit — Keep AGENTS.md Aligned with Codebase

Use when: codebase has changed and AGENTS.md may be stale.

### What to Check

Go through each section of `AGENTS.md` and verify against actual code:

| Section                                                | What to verify                                                       |
| ------------------------------------------------------ | -------------------------------------------------------------------- |
| Tech Stack                                             | `package.json` dependencies match described stack                    |
| npm-scripts                                            | All scripts in `package.json` are documented and described correctly |
| File structure (`src/spy/`, `src/brain/`, `src/hand/`) | Directories actually exist, descriptions match code                  |
| War Room Convention                                    | `war-room/` structure matches documented paths                       |
| LLM Providers                                          | `src/brain/providers/` — documented providers match actual files     |
| MCP servers                                            | Documented servers exist in `mcp_config.json`                        |
| Session Completion checklist                           | Steps still accurate (commands, file paths)                          |

### Quality Scoring

For each section rate 1–5:

- **5**: Completely accurate, comprehensive
- **3**: Mostly accurate, minor gaps
- **1**: Stale or missing critical information

### Output Format

```markdown
## AGENTS.md Audit Report

### Summary

Overall quality: X/5 — [brief assessment]

### Sections Needing Update

#### [Section Name] — Score: X/5

**Issue**: [what's wrong]
**Current text**: "[old text]"
**Suggested update**: "[new text]"

### Sections That Are Current

- [Section]: ✅ accurate
```

After presenting the report, **ask before making any changes**.

---

## Tool 2: Capture — Record Session Learnings

Use at the end of a session when something was discovered that AGENTS.md doesn't mention.

### Trigger Phrases

- "update AGENTS.md with what we learned"
- "capture session learnings"
- "add this to project rules"
- `/revise-agents-md`

### What to Capture

Review the current session and extract:

1. **New conventions** discovered or established
2. **Gotchas** encountered (e.g., specific PowerShell quirks, env variable behavior)
3. **Architecture decisions** made with rationale
4. **Patterns** that should be followed in future

### What NOT to Capture

- Temporary workarounds
- Things specific to only this one task
- Information already covered in `docs/`
- Debug steps that won't apply again

### Process

1. List candidate learnings with proposed AGENTS.md section
2. Present to user for approval
3. Make targeted edits — do not rewrite entire sections
4. Keep additions concise — one rule per bullet point

---

## PaxBot AGENTS.md Location

Primary file: `d:\Pax-Automata\AGENTS.md`

Related documentation to keep in sync:

- `docs/architecture.md` — architectural decisions
- `docs/decisions.md` — ADR log
- `docs/todo.md` — pending work
- `docs/changelog.md` — what changed

**Rule**: If a change is architectural (new module, changed interface, new pattern), update both `AGENTS.md` AND the relevant `docs/` file.
