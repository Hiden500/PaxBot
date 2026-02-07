# Pax Historia — Game Research Reference

Persistent reference doc for building Pax-Automata. Updated as we learn more from the live game.

---

## 1. What Is Pax Historia?

An AI-powered alternate-history grand strategy sandbox — browser-based, free-to-play with token monetization. Players pick a nation and moment in history, then reshape global events through free-text actions, AI diplomacy, and time-jumps.

- **Founders:** Eli Bullock-Papa, Ryan Zhang
- **YC Batch:** W26 (Winter 2026)
- **Location:** San Francisco, CA
- **Team size:** ~3
- **Alpha launch:** August 18, 2025
- **DAU:** 35,000
- **Token throughput:** 100+ billion tokens/week
- **Presets:** 4,000+ community-published (50+ plays each)
- **URL:** https://www.paxhistoria.co
- **Beta:** https://beta.paxhistoria.co

---

## 2. Core Gameplay Loop

Pax Historia uses a **"Decisional Pause"** model: time is frozen while the player acts, then the world simulates forward on a time-jump.

**Per-turn cycle:**

1. **Read events** — After each jump, AI-generated events describe what happened (military, borders, diplomacy, economy).
2. **Consult the Advisor** — Ask the AI advisor for strategic guidance or situation summaries.
3. **Submit Actions** — Write free-text commands describing what your nation does.
4. **Conduct Diplomacy** — Chat with AI-controlled nations (1-on-1 or group).
5. **Jump Forward** — Select a time increment (1 week to 1 year) and advance. AI simulates all actions, diplomacy, and world events.

**Key mechanics:**
- Actions can be brainstormed by AI, enhanced/polished, or written freehand.
- Submitting an action costs zero tokens — you only pay on jump.
- Longer jumps = more events = more tokens.
- During a jump: **Save** (preserve mid-simulation) or **Intervene** (halt at a specific event).
- **Difficulty levels:** Very Easy, Easy, Normal (default), Hard, Impossible.
- **Rewind:** Players can revert to earlier states.

---

## 3. UI Elements We Automate

### Action Box
- **Icon:** Lightning bolt (bottom-right)
- **Selector:** `textarea[placeholder="Enter your action..."]`
- Free-text input for nation directives.
- **Brainstorm** button — AI suggests actions based on game state.
- **Enhance** button — AI rewrites/optimizes action text (costs tokens).
- Actions can be edited after submission by clicking them.

### Advisor Chat
- **Icon:** Person/flag icon (bottom-right)
- **Selector:** `textarea[placeholder="Ask your advisor..."]`
- Conversational interface for strategic counsel.
- Longer formatted responses (bullets, headings).
- Auto-generated prompt suggestions available.
- More token-expensive than diplomacy chats.

### Diplomacy Chat
- **Icon:** Speech bubble (bottom-left)
- **Selector:** `TODO — need DevTools inspection`
- Three entry points: (1) speech bubble → "Start New Chat", (2) click region → "Open Diplomacy", (3) AI-initiated from events.
- Supports private 1-on-1 and group chats.
- In group chats, nations take turns based on conversation direction.
- Chat content directly influences events during jumps.

### Timeline / Time-Jump
- **Icon:** Triple right-pointing arrows (top-right)
- **Selector:** `TODO — need DevTools inspection`
- Opens timeline tab with available dates.
- Jump options: next major event, or specific date (1 week to 1 year).
- During simulation: Save and Intervene buttons.

### Map
- Interactive world map with regions belonging to countries.
- Region types: Land, Coastal, Ocean, Strait.
- Battalions (military units), Cities (squares), Capitals (stars).
- Clicking a region reveals country info + diplomacy option.

### Settings / Cheats
- **Icon:** Three vertical dots (top-left)
- Contains: AI Model selection, Difficulty, Cheats, Events (Ctrl+E), Prompts editor.

---

## 4. Submit Mechanics

- **Action submit:** `TODO — need DevTools inspection (button click? Enter key? Both?)`
- **Advisor submit:** `TODO — need DevTools inspection`
- **Diplomacy submit:** `TODO — need DevTools inspection`
- **Time-jump trigger:** `TODO — need DevTools inspection`

---

## 5. AI Models

29 total models: 3 non-experimental + 26 experimental.

### Non-Experimental Tiers

| Tier | Model | Thinking Tokens | Relative Cost | Notes |
|------|-------|----------------|---------------|-------|
| **Light** | Gemini 2.0 Flash | 0 | ~0.002 tokens/turn | Cheapest, lowest quality |
| **Pro** | Gemini 3.0 Flash | 1,000 | ~0.02 tokens/turn | Default, balanced |
| **Max** | Gemini 2.5 Pro | 10,000 | ~0.07 tokens/turn | Best quality, slowest |

### Notable Experimental Models

| Model | Cost | Notes |
|-------|------|-------|
| Xiaomi Mimo (+ Think) | Free | Unstable |
| DeepSeek 3.1 Terminus | $$ | Slow |
| DeepSeek 3.2 Exp | $ | Decent, 0 thinking tokens |
| Grok Fast / 4.1 Fast Think | $ | Generates unnecessary map features |
| Gemini 2.5 Flash Lite | $ | Fast, light |
| Gemini 3 Pro | $$$$$ | Heavy reasoning |
| GPT-5.1 | $$$$$ | Crashes frequently; 10K thinking tokens |
| Qwen3 variants (6) | Various | Flash, Plus, Max, 253B Thinking, Next 80B |
| WW2 Models (Light/Pro/Max) | Varies | Specialized for WW2 preset; tends to railroad |

### Model switching
In-game: three-dot menu (top-left) → Cheats → AI Model.

### Pax Patron / BYOK
Patrons can use their own OpenRouter API key (via Google AI Studio). Keys stored with AES-256 encryption. By round ~80, single interactions can reach 100K tokens.

---

## 6. Internal Prompt Categories

8 prompt categories exposed via the in-game prompt editor (three-dot menu → Prompts):

| Category | Purpose |
|----------|---------|
| **Chat with User** | Diplomacy chat responses |
| **Chat with Advisor** | Advisor consultation responses |
| **Jump Forward** | Time progression event generation |
| **Auto Jump Forward** | Automated time advancement |
| **Actions** | Processing player-submitted actions |
| **Next Speaker** | Turn management in group chats |
| **Description to Action** | Converting narrative → mechanical game effects |
| **Event Consolidator** | Aggregating/summarizing events for AI context |

### Prompt system details
- Each category: "Default" (system-provided) or "Local" (custom-edited).
- Template variables available, e.g. `${ALL_EVENTS_WITH_CONSOLIDATION}`.
- Preset creators can fully rewrite prompts while keeping required injection functions.

### Event Consolidation
- Summaries of prior rounds that give the AI critical context.
- Starts on round 15 (configurable), chunk size 5 rounds per summary.
- Essential for long games (20+ rounds) to prevent context overflow.

---

## 7. `/api/simple-chat` Endpoint

Our Spy intercepts responses from this endpoint to extract full game state.

**Known contents (from PRD + wiki):**
- Full text description of the map
- Current battalion summaries
- Event history

**Exact JSON schema:** `TODO — need network tab capture from live game`

---

## 8. AI Infrastructure

- Before Q4 2025: directly connected to 30+ AI provider endpoints.
- After Q4 2025: migrated to **Infron AI** as unified infrastructure layer.
- All model calls use a unified OpenAI-compatible SDK format.
- Infron provides: unified API gateway, billing, dedicated throughput, >99.9% SLA.

---

## 9. Token Economics

| Game Length (rounds) | Light Cost | Pro Cost | Max Cost |
|---------------------|-----------|---------|---------|
| Early rounds | ~0.52 tokens | ~0.52 tokens | ~0.52 tokens |
| 250+ rounds | ~0.52 tokens | ~5.2 tokens | ~32.06 tokens |

- New accounts: 1 free token on signup.
- Daily login: 0.20 tokens (resets every 20 hours, no stacking).
- Preset creators earn 10% of tokens spent by others (if 150+ rounds played).

---

## 10. Community & Resources

| Resource | URL |
|----------|-----|
| Main game | https://www.paxhistoria.co |
| Beta site | https://beta.paxhistoria.co |
| Presets | https://www.paxhistoria.co/presets |
| Wiki | https://wiki.paxhistoria.co |
| Fandom Wiki | https://paxhistoria.fandom.com |
| Discord | https://discord.gg/Pt437X89dj |
| Reddit | https://www.reddit.com/r/PaxHistoria |
| YouTube | https://www.youtube.com/@PaxHistoriaOfficial |
| LinkedIn | https://www.linkedin.com/company/pax-historia |
| Support | support@paxhistoria.co |

---

## Sources

- [YC Company Page](https://www.ycombinator.com/companies/pax-historia)
- [Launch YC](https://www.ycombinator.com/launches/PMu-pax-historia-user-ai-powered-gaming-platform)
- [Pax Historia Wiki — Main Page](https://wiki.paxhistoria.co/wiki/Main_Page)
- [Pax Historia Wiki — Basic Gameplay](https://wiki.paxhistoria.co/wiki/Basic_Gameplay)
- [Pax Historia Wiki — Actions](https://wiki.paxhistoria.co/wiki/Actions)
- [Pax Historia Wiki — A.I. Quality](https://wiki.paxhistoria.co/wiki/A.I._Quality)
- [Pax Historia Wiki — Chats](https://wiki.paxhistoria.co/wiki/Chats)
- [Pax Historia Wiki — Advisor](https://wiki.paxhistoria.co/wiki/Advisor)
- [Pax Historia Wiki — Jumping Forward](https://wiki.paxhistoria.co/wiki/Jumping_Forward)
- [Pax Historia Wiki — Token System](https://wiki.paxhistoria.co/wiki/Token_System)
- [Pax Historia Wiki — Gameplay Map](https://wiki.paxhistoria.co/wiki/Gameplay_Map)
- [Pax Historia Wiki — Editing Prompts (Advanced)](https://wiki.paxhistoria.co/wiki/Editing_Prompts_(Advanced))
- [Pax Historia Wiki — Consolidation Settings (Advanced)](https://wiki.paxhistoria.co/wiki/Consolidation_Settings_(Advanced))
- [Pax Historia Wiki — Pax Patron](https://wiki.paxhistoria.co/wiki/Pax_Patron)
- [Infron AI — Pax Historia Case Study](https://models.infron.ai/blog/pax-historia-case-study)
