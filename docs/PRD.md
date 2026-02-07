This technical specification details the architecture and implementation roadmap for an autonomous agent designed to play **Pax Historia**, a browser-based grand strategy simulation. This document provides the necessary context for an engineer to understand the game's mechanics and build a persistent, strategic player.

---

# **Project Specification: Pax Historia Strategic Agent**

## **1. Domain Overview: What is Pax Historia?**

Pax Historia is a history-based simulation game where a player leads a nation through a world of independent polities, hidden motives, and unfolding events.

### **Core Game Mechanics**

* **Decisional Pause:** Time is **paused** while the player makes decisions, such as chatting with foreign powers, issuing internal orders, or consulting their advisor.
* **The Time-Jump:** Once the player is ready, they choose a **future date** to "jump forward" to. During this time, the world evolves based on player actions and the independent goals of other nations.
* **Simulation Elements:** Military units move, borders shift, and governments may fall during a jump.
* **The Advisor:** Players have a chief advisor who provides realistic, strategic guidance and explains the world situation.
* **Agency & Risk:** Players are free to try any action, but they are not all-powerful—orders may fail, generals may disobey, and factions may rebel.

---

## **2. System Architecture**

The agent operates as a **Cognitive Loop** that perceives the game state, reasons through goals using a persistent memory system, and executes commands through browser automation.

### **2.1 High-Level Component Breakdown**

1. **Perception (The Spy):** A network interceptor that captures the game's internal JSON data.
2. **The War Room (Local Memory):** A persistent file system storing long-term goals and ongoing plans.
3. **The Brain (LLM Logic):** An LLM that assembles context and generates strategic moves.
4. **Execution (The Hand):** An automation layer that interacts with the browser UI.

---

## **3. Step-by-Step Implementation Roadmap**

### **Step 1: Perception Layer (Phase 1)**

The agent must "see" the truth of the world without using unstable computer vision.

* **Action:** Use Playwright to intercept network responses from the `/api/simple-chat` endpoint.
* **Data Capture:** This payload contains the full text description of the map, current battalion summaries, and event history.
* **Storage:** Parse this JSON and write the relevant state information to `current_state.json`.

### **Step 2: The War Room Configuration (Phase 2)**

Define the persistent files that provide the agent with a "identity" and "memory."

* **`constitution.md`:** A fixed document defining long-term goals (e.g., "Conquer the world," "Build up local industry").
* **`crisis_handbook.txt`:** A playbook of tactical doctrines (e.g., specific procedures for managing internal dissent or executing a coup).
* **`strategic_ledger.json`:** The "Long-Term Memory." This tracks **Active Plans**—multi-turn operations that must be remembered across different game "jumps."

### **Step 3: Strategic Consultation (Phase 2.5)**

The agent should leverage the game's built-in intelligence as a "Chief of Staff".

* **Action:** Implement a function to type a query into the "Ask your advisor..." chat box and scrape the text response.
* **Goal:** Obtain fresh tactical insights (e.g., "Identify which nations are currently weak") to include in the reasoning context.

### **Step 4: Reasoning & Decision Making (Phase 3)**

The "Brain" combines all inputs to decide the turn's moves.

* **Action:** Assemble `current_state.json`, `constitution.md`, `crisis_handbook.txt`, and the Advisor's feedback into an LLM prompt.
* **Logic:**
  1. Update the status of existing operations in the Ledger.
  2. Filter new ideas against the Constitution.
  3. Select tactics from the Handbook.
  4. Generate a **Batch of Actions** (JSON list).
* **Internal Save:** Update the local ledger with new attempted plans to ensure they are remembered if the execution phase is interrupted.

### **Step 5: Batch Execution (Phase 4)**

* **Batching:** The Brain outputs a list of moves (e.g., `["Order naval supply depots", "Mobilize elite battalions"]`).
* **Automation:** The Playwright "Hand" iterates through the list, typing each command into the "Actions" field and clicking submit.
* **Memory Commit:** Once all actions are submitted, perform a final write to `strategic_ledger.json` to mark the turn's operations as officially advanced.

---

## **4. Technical Data Schema**

### **Strategic Ledger (`strategic_ledger.json`)**

```json
{
  "active_operations": [
    {
      "operation_id": "OP_001",
      "goal": "Annex neighboring territory",
      "current_phase": 2,
      "steps": [
        {"phase": 1, "action": "Increase world population and prosperity", "status": "COMPLETE"},
        {"phase": 2, "action": "Mobilize Nova Solar Legion I to border", "status": "PENDING"}
      ]
    }
  ]
}
```

### **Command Interface**

The agent interacts with two primary UI elements:

* **Action Box:** `textarea[placeholder="Enter your action..."]`.
* **Advisor Box:** `textarea[placeholder="Ask your advisor..."]`.
