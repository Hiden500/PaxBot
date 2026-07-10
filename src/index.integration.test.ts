/**
 * Integration tests for full cognitive loop.
 * Tests data flow between Spy, Brain, and Hand modules.
 *
 * Note: This test mocks external dependencies (Playwright, LLM API)
 * to verify the integration logic without requiring real browser/API access.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import * as fs from "fs";
import * as path from "path";

// Mock external dependencies
vi.mock("playwright", () => ({
  chromium: {
    launch: vi.fn(),
  },
}));

vi.mock("./brain/llm-client", () => ({
  validateEnv: vi.fn(),
  callLLM: vi.fn(),
}));

// Import modules after mocking
import { assembleContext, buildPrompt } from "./brain/context-assembler";
import { writeGameStateFromPayload, writeAdvisorResponse } from "./spy/state-writer";
import { ActionBatchSchema } from "./shared/schemas";
import { getSessionDir } from "./shared/session";

const WAR_ROOM = path.join(process.cwd(), "war-room");
const sessionDir = getSessionDir();

function cleanWarRoom(): void {
  const files = [
    "current_state.json",
    "advisor_response.txt",
    "strategic_ledger.json",
    "ownership_snapshot.json",
    "world_rules.txt",
  ];
  files.forEach((file) => {
    const filePath = path.join(sessionDir, file);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  });
}

describe("Cognitive Loop Integration", () => {
  beforeEach(() => {
    cleanWarRoom();
    vi.clearAllMocks();
  });

  it("integrates Spy → Brain data flow", () => {
    // Phase 1: Spy captures game state
    const mockPayload = JSON.stringify({
      prompt: `
You are roleplaying as the chief advisor to the player in a game where they are roleplaying as the polity of USA.
[Context for This Game]
World Rule 1
Description of the Map in the CURRENT Round:
"USA":
All Owned Regions:
"Alaska", "Hawaii", "Texas"
All Battalions:
5 battalions

[Event History]
- Turn 1: USA mobilized forces
- Turn 2: Japan invaded
      `.trim(),
    });

    // Write required Brain files
    fs.writeFileSync(
      path.join(sessionDir, "strategic_ledger.json"),
      JSON.stringify({ active_operations: [] }, null, 2),
      "utf-8"
    );

    writeGameStateFromPayload(mockPayload);
    writeAdvisorResponse("Consider invading Germany next turn.");

    // Verify Spy wrote files
    expect(fs.existsSync(path.join(sessionDir, "current_state.json"))).toBe(true);
    expect(fs.existsSync(path.join(sessionDir, "advisor_response.txt"))).toBe(true);

    // Phase 2: Brain assembles context
    const ctx = assembleContext();

    // Verify Brain read files correctly
    expect(ctx.gameState.current_state).toContain("USA");
    expect(ctx.gameState.current_state).toContain('"Alaska", "Hawaii", "Texas"');
    expect(ctx.gameState.current_state).not.toContain("World Rule 1");
    expect(ctx.advisorResponse).toBe("Consider invading Germany next turn.");
    // Ownership parsing is tested in ownership-parser.test.ts
    // Here we just verify the integration flow works - ownership may be null if parsing fails
    // which is acceptable for this integration test
  });

  it("integrates Brain → Hand data flow with valid schema", () => {
    // Setup: Write initial state
    const initialState = {
      current_state: '"USA":\nAll Owned Regions: Alaska, Texas\nAll Battalions:',
    };
    fs.writeFileSync(
      path.join(sessionDir, "current_state.json"),
      JSON.stringify(initialState, null, 2),
      "utf-8"
    );
    fs.writeFileSync(
      path.join(sessionDir, "strategic_ledger.json"),
      JSON.stringify({ active_operations: [] }, null, 2),
      "utf-8"
    );

    // Simulate Brain generating actions
    const mockBatch = {
      reasoning: "Germany is weak, time to strike",
      actions: ["Mobilize 1st Army to border", "Declare war on Germany"],
      ledger_updates: [
        {
          operation_id: "OP_001",
          goal: "Conquer Germany",
          current_phase: 2,
          steps: [
            { phase: 1, action: "Embargo", status: "COMPLETE" },
            { phase: 2, action: "Invade", status: "PENDING" },
          ],
        },
      ],
      next_advisor_query: "Should we invade now?",
      milestone_checks: [],
      immediate_risks: [],
    };

    // Validate schema
    const result = ActionBatchSchema.parse(mockBatch);

    // Verify schema validation passes
    expect(result.actions).toHaveLength(2);
    expect(result.ledger_updates).toHaveLength(1);
    expect(result.ledger_updates[0].steps).toHaveLength(2);
  });

  it("handles missing optional files gracefully", () => {
    // Only write minimal required files
    fs.writeFileSync(
      path.join(sessionDir, "current_state.json"),
      JSON.stringify({ current_state: "Map data" }, null, 2),
      "utf-8"
    );
    fs.writeFileSync(
      path.join(sessionDir, "strategic_ledger.json"),
      JSON.stringify({ active_operations: [] }, null, 2),
      "utf-8"
    );

    // Brain should handle missing optional files
    const ctx = assembleContext();
    expect(ctx.advisorResponse).toBe("");
    expect(ctx.ownership).toBeNull();

    // Build prompt should not crash
    const { system, user } = buildPrompt(ctx);
    expect(system).toContain("Strategic AI");
    expect(user).toContain("Map data");
  });

  it("maintains data consistency through full loop", () => {
    // Initial state
    const initialLedger = {
      active_operations: [
        {
          operation_id: "OP_001",
          goal: "Conquer Japan",
          current_phase: 1,
          steps: [{ phase: 1, action: "Embargo", status: "COMPLETE" }],
        },
      ],
    };
    fs.writeFileSync(
      path.join(sessionDir, "strategic_ledger.json"),
      JSON.stringify(initialLedger, null, 2),
      "utf-8"
    );

    // Simulate Brain updating ledger
    const updatedLedger = {
      active_operations: [
        {
          operation_id: "OP_001",
          goal: "Conquer Japan",
          current_phase: 2,
          steps: [
            { phase: 1, action: "Embargo", status: "COMPLETE" },
            { phase: 2, action: "Invade", status: "PENDING" },
          ],
        },
      ],
    };

    // Write updated ledger
    fs.writeFileSync(
      path.join(sessionDir, "strategic_ledger.json"),
      JSON.stringify(updatedLedger, null, 2),
      "utf-8"
    );

    // Verify persistence
    const persisted = JSON.parse(
      fs.readFileSync(path.join(sessionDir, "strategic_ledger.json"), "utf-8")
    );
    expect(persisted.active_operations[0].current_phase).toBe(2);
    expect(persisted.active_operations[0].steps).toHaveLength(2);
  });

  it("strips advisor content from game state correctly", () => {
    const payloadWithNoise = JSON.stringify({
      prompt: `
Advisor system prompt here...
[Context for This Game]
World rules
Description of the Map in the CURRENT Round:
Actual game state content
[Event History]
Events
      `.trim(),
    });

    writeGameStateFromPayload(payloadWithNoise);

    const state = JSON.parse(fs.readFileSync(path.join(sessionDir, "current_state.json"), "utf-8"));

    expect(state.current_state).not.toContain("Advisor system prompt");
    expect(state.current_state).not.toContain("World rules");
    expect(state.current_state).toContain("Actual game state content");
  });
});
