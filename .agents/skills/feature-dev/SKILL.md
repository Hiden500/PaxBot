---
name: feature-dev
description: Structured 7-phase workflow for developing new features. Use when the user wants to build a new feature that touches multiple files or requires architectural decisions. Triggers on: "build feature", "implement", "add functionality", "design architecture for".
---

# Feature Development Workflow

A systematic 7-phase approach to building features correctly: understand first, design deliberately, implement with confidence, review for quality.

**Use for**: features touching multiple files, unclear requirements, architectural decisions.
**Skip for**: single-line fixes, trivial changes, urgent hotfixes.

---

## Phase 1: Discovery

**Goal**: Understand what needs to be built.

- Clarify the feature request — what problem does it solve?
- Identify constraints, requirements, and success criteria
- Summarize understanding and confirm with the user before proceeding

**Output**: One-paragraph statement of what will be built and why.

---

## Phase 2: Codebase Exploration

**Goal**: Understand relevant existing code and patterns.

Explore these aspects in parallel:

- Find features similar to what's being built, trace implementation
- Map the architecture and abstractions in the relevant area
- Analyze current implementation of related functionality

**Output**: Summary of key files, patterns, and architecture insights with `file:line` references.

For PaxBot, always check:

- `src/spy/` for data extraction patterns
- `src/brain/` for LLM integration patterns
- `src/hand/` for action execution patterns
- `docs/architecture.md` for architectural constraints

---

## Phase 3: Clarifying Questions

**Goal**: Fill all gaps before designing.

Identify underspecified aspects:

- Edge cases and error conditions
- Integration points with existing modules
- Backward compatibility requirements
- Performance and reliability needs
- Data flow through Spy → Brain → Hand

**WAIT for user answers before proceeding to Phase 4.**

---

## Phase 4: Architecture Design

**Goal**: Design multiple implementation approaches.

Present 2–3 options, each with:

- What changes (files, interfaces)
- Pros and cons
- Complexity estimate

Standard options to consider:

- **Minimal changes**: smallest change, maximum reuse of existing code
- **Clean architecture**: maintainability, elegant abstractions, better testability
- **Pragmatic balance**: speed + quality, good boundaries without excessive refactoring

State your recommendation and why.

**ASK which approach the user prefers before implementing.**

---

## Phase 5: Implementation

**Goal**: Build the feature.

- **WAIT for explicit approval** on the chosen architecture before starting
- Read all relevant files identified in Phases 2–4
- Follow existing patterns discovered in exploration
- Write TypeScript strict mode, async/await, ES Modules
- Add JSDoc for public interfaces
- Track progress as you go

PaxBot conventions:

- Dependency injection — no singleton globals
- Errors bubble up to the cognitive loop, not swallowed
- All LLM calls go through `src/brain/providers/`
- State persisted to `war-room/` follows existing naming conventions

---

## Phase 6: Quality Review

**Goal**: Ensure code is correct, simple, and maintainable.

Review the implementation for:

- **Correctness**: logic errors, missing error handling, silent failures
- **Simplicity/DRY**: unnecessary complexity, duplicate code, over-abstraction
- **Conventions**: TypeScript strict compliance, project patterns, AGENTS.md rules

For each issue found: state file:line, why it's a problem, suggested fix.

Present findings and ask what to do:

- Fix now (critical issues)
- Fix later (create TODO)
- Proceed as-is (acceptable trade-off)

Run after fixing:

```powershell
npm run typecheck
npm test
```

---

## Phase 7: Summary

**Goal**: Document what was accomplished.

Produce a summary:

- What was built
- Key architectural decisions made
- Files created/modified (with brief description of each)
- Suggested next steps

Update docs if architecture changed:

- `docs/architecture.md` — if new module or significant pattern added
- `docs/todo.md` — remaining work or known limitations
- `docs/changelog.md` — what changed and why

Commit following Conventional Commits:

```powershell
git --no-pager add .
git --no-pager commit -m "feat(area): short description"
git --no-pager push
```

---

## Quick Reference

```
Phase 1: Discovery       → Understand the problem
Phase 2: Exploration     → Read existing code
Phase 3: Questions       → Fill gaps (USER INPUT REQUIRED)
Phase 4: Architecture    → Design options (USER INPUT REQUIRED)
Phase 5: Implementation  → Build it (USER APPROVAL REQUIRED)
Phase 6: Review          → typecheck + test + code quality
Phase 7: Summary         → docs + commit + push
```
