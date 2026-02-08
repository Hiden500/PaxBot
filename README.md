# Pax-Automata

An autonomous AI agent that plays [Pax Historia](https://www.paxhistoria.co) — a browser-based, AI-powered grand strategy game where you lead a nation through alternate history.

## What is Pax Historia?

Pax Historia is a grand strategy sandbox where players pick a nation and a moment in history, then reshape the world through free-text actions, AI-driven diplomacy, and time-jumps. Every decision is processed by generative AI that simulates realistic geopolitical consequences. Think Civilization meets a creative writing partner.

## How It Works

Pax-Automata runs a **cognitive loop** that mimics how a human player thinks:

1. **Spy (Perception)** — Intercepts the game's network traffic to read the current world state: borders, battalions, events, diplomacy.
2. **War Room (Memory)** — Consults local files that define the agent's long-term goals, tactical playbook, and memory of ongoing operations.
3. **Brain (Reasoning)** — Sends all context to an LLM (Claude) which updates its strategic plans and generates a batch of actions.
4. **Hand (Execution)** — Types each action into the game's UI via browser automation, then triggers a time-jump to advance the world.

This loop repeats every turn, building on previous plans and adapting to new events.

## Architecture

See `docs/diagrams/war-room-flow.mmd` for the full sequence diagram, or the rendered version at `docs/diagrams/war-room-flow.png`.

```
Browser (Pax Historia)
    ↕ network intercept
Spy → current_state.json → Brain → ActionBatch → Hand → Browser
         ↑                    ↑
    constitution.md      Claude API
    crisis_handbook.txt
    strategic_ledger.json
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Install

```bash
git clone https://github.com/phillipyan300/Pax-Automata.git
cd Pax-Automata
npm install
```

### Build

```bash
npm run build
```

### Run

```bash
npm start
```

### Interactor (login, navigate, test text entry)

One script drives a single game session: loads saved auth, opens the game, and can type into the action/advisor boxes. Useful for testing navigation and UI before wiring the full agent.

```bash
# Capture auth once (manual Google login), then:
npm run capture-auth

# Run the interactor (browser stays open until you press Enter)
npm run interactor
```

- **Open a specific game page:** `GAME_URL=https://www.paxhistoria.co/game/your-game-id npm run interactor`
- **Run a quick action/advisor test:** `TEST_ENTRY=1 npm run interactor` (submits one action and one advisor query after load)

See [`docs/auth-setup.md`](docs/auth-setup.md) for auth state and [`src/interactor.ts`](src/interactor.ts) for the script.

> The full cognitive loop is under active development. The interactor and auth flow are working; Perception (Spy) and Brain are in progress. See [Project Status](#project-status) below.

## Project Status

Tracked in [`docs/project-tracker.md`](docs/project-tracker.md).

| Phase | Status |
|-------|--------|
| Phase 0: Project Init | Done |
| Phase 1: Perception (Spy) | In Progress |
| Phase 2: War Room | Pending |
| Phase 2.5: Advisor Query | Pending |
| Phase 3: Brain (LLM) | Pending |
| Phase 4: Hand (Execution) | Pending |

## Tech Stack

| Layer | Choice |
|-------|--------|
| Browser automation | Playwright |
| Runtime | Node.js + TypeScript |
| LLM | Anthropic Claude API |
| Validation | Zod |
| TS execution | tsx |
| Agent memory | JSON + Markdown files in `war-room/` |

## Design Docs

- **Product spec:** [`docs/PRD.md`](docs/PRD.md)
- **Sequence diagram:** [`docs/diagrams/war-room-flow.mmd`](docs/diagrams/war-room-flow.mmd)
- **Game research:** [`docs/pax-historia-research.md`](docs/pax-historia-research.md)

## Contributing

1. Read [`CLAUDE.md`](CLAUDE.md) — the project constitution (tech stack, paths, coding standards, git workflow).
2. Check [`docs/project-tracker.md`](docs/project-tracker.md) for current status.
3. Create a `feature/`, `fix/`, or `chore/` branch. Never commit directly to `main`.
4. The maintainer squash-merges into `main` after review.
