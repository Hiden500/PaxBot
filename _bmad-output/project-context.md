---
project_name: "Pax-Automata"
user_name: "Yurew"
date: "2026-07-15"
sections_completed: ["technology_stack", "critical_rules", "code_patterns"]
existing_patterns_found: 12
---

# Project Context for AI Agents

_This file contains critical rules and patterns that AI agents must follow when implementing code in this project. Focus on unobvious details that agents might otherwise miss._

---

## Technology Stack & Versions

- **TypeScript**: v5.9.3 (strict mode, ES Modules target)
- **Node.js**: >= 20.12.0
- **Playwright**: v1.61.1 (used for browser interaction and traffic interception)
- **Zod**: v4.4.3 (used for LLM response schema validation and runtime type safety)
- **Vitest**: v4.1.9 (unit, integration, and E2E testing framework)
- **Express / Socket.IO**: v5.2.1 / v4.8.3 (local web server and real-time dashboard events)
- **LLM Clients**: `@google/genai` (v1.52.0), `openai` (v6.45.0)

---

## Critical Implementation Rules

1. **Safety & Security First**: Priorities: **security > architecture > functionality > convenience**.
2. **Never Fabricate/Hallucinate entities**: When generating actions, use only game entities, nations, and regions explicitly present in the current `game_state`. Do not assume names or states.
3. **Strict Git Pager Off**: When running Git CLI commands, ALWAYS prefix them with `--no-pager` (e.g., `git --no-pager log`).
4. **Zod Validation**: When parsing responses, rely on Zod validation. Keep LLM response structures synchronized across all providers.
5. **No IO-in-loop**: Avoid nested or rapid consecutive filesystem calls during loop execution. Pre-load/batch state where possible.
6. **Error handling**: Rely on structured Zod validation fields (`ledger_updates`, `milestone_checks`, `immediate_risks`) instead of regex patterns on response strings.
7. **Session Isolation**: All game states, memories, and strategies must be saved under the active campaign session directory (`war-room/sessions/<campaign-slug>/`). Never write session-specific data to global directory.

---

## Code Patterns & Architecture

### Naming Conventions

- File names use kebab-case (e.g., `context-assembler.ts`, `state-writer.ts`).
- Test files suffix: `*.test.ts` or `*.integration.test.ts`.

### Project Layout

- `src/spy/`: Perception layer. Extracts state and updates `current_state.json`.
- `src/brain/`: Strategic loop. Integrates all inputs and communicates with LLM providers.
- `src/hand/`: Playwright actions. Executes browser clicks and input forms.
- `src/memory/`: Long-term strategy persistence (rival profiles, achievements, lessons learned).
- `src/campaign/`: Validation and loading of campaign templates and configs.
- `src/shared/`: Reusable types, schemas, and configurations.
