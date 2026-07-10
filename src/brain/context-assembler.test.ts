/**
 * Unit tests for Brain: context-assembler.ts
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import * as fs from "fs";

vi.mock("fs", () => ({
  readFileSync: vi.fn(),
  existsSync: vi.fn(),
  readdirSync: vi.fn(() => []),
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn(),
}));

vi.mock("path", () => ({
  join: vi.fn((...args: string[]) => {
    // Handle absolute paths starting with "D:" — just join with /
    const parts = args.map(String);
    // If any part looks like a drive letter, handle specially
    if (parts.some((p) => /^[A-Za-z]:/.test(p))) {
      return parts.join("/").replace(/\\/g, "/");
    }
    return parts.join("/");
  }),
  resolve: vi.fn((...args: string[]) => {
    const parts = args.map(String);
    return parts.join("/").replace(/\\/g, "/");
  }),
  basename: vi.fn((p: string) => p.split("/").pop() ?? p),
}));

import { assembleContext, buildPrompt } from "./context-assembler";
import type { BrainContext } from "./context-assembler";

// ---------------------------------------------------------------------------
// assembleContext
// ---------------------------------------------------------------------------

describe("assembleContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads all war room files and returns a complete BrainContext", () => {
    (fs.readFileSync as any).mockImplementation((filePath: string) => {
      if (filePath.includes("current_state.json")) {
        return JSON.stringify({ current_state: "Map data with regions" });
      }
      if (filePath.includes("constitution.md")) {
        return "Our goal is world domination.";
      }
      if (filePath.includes("crisis_handbook.txt")) {
        return "When invaded, mobilize all forces.";
      }
      if (filePath.includes("strategic_ledger.json")) {
        return JSON.stringify({ active_operations: [] });
      }
      if (filePath.includes("advisor_response.txt")) {
        return "Consider invading Japan.";
      }
      if (filePath.includes("ownership_snapshot.json")) {
        return JSON.stringify({ our_nation: "USA", regions_we_own: ["Alaska"] });
      }
      return "";
    });
    (fs.existsSync as any).mockReturnValue(true);

    const ctx = assembleContext();

    expect(ctx.gameState.current_state).toBe("Map data with regions");
    expect(ctx.ledger.active_operations).toEqual([]);
    expect(ctx.advisorResponse).toBe("Consider invading Japan.");
    expect(ctx.ownership).toEqual({ our_nation: "USA", regions_we_own: ["Alaska"] });
  });

  it("sets advisorResponse to empty string when advisor_response.txt does not exist", () => {
    (fs.readFileSync as any).mockImplementation((filePath: string) => {
      if (filePath.includes("current_state.json")) {
        return JSON.stringify({ current_state: "Map data" });
      }
      if (filePath.includes("constitution.md")) {
        return "Constitution.";
      }
      if (filePath.includes("crisis_handbook.txt")) {
        return "Handbook.";
      }
      if (filePath.includes("strategic_ledger.json")) {
        return JSON.stringify({ active_operations: [] });
      }
      return "";
    });
    (fs.existsSync as any).mockImplementation((filePath: string) => {
      return (
        !filePath.includes("advisor_response.txt") && !filePath.includes("ownership_snapshot.json")
      );
    });

    const ctx = assembleContext();
    expect(ctx.advisorResponse).toBe("");
  });

  it("sets ownership to null when ownership_snapshot.json does not exist", () => {
    (fs.readFileSync as any).mockImplementation((filePath: string) => {
      if (filePath.includes("current_state.json")) {
        return JSON.stringify({ current_state: "Map data" });
      }
      if (filePath.includes("constitution.md")) {
        return "Constitution.";
      }
      if (filePath.includes("crisis_handbook.txt")) {
        return "Handbook.";
      }
      if (filePath.includes("strategic_ledger.json")) {
        return JSON.stringify({ active_operations: [] });
      }
      return "";
    });
    (fs.existsSync as any).mockReturnValue(false);

    const ctx = assembleContext();
    expect(ctx.ownership).toBeNull();
  });

  it("sets ownership to null when ownership_snapshot.json is invalid JSON", () => {
    (fs.readFileSync as any).mockImplementation((filePath: string) => {
      if (filePath.includes("current_state.json")) {
        return JSON.stringify({ current_state: "Map data" });
      }
      if (filePath.includes("constitution.md")) {
        return "Constitution.";
      }
      if (filePath.includes("crisis_handbook.txt")) {
        return "Handbook.";
      }
      if (filePath.includes("strategic_ledger.json")) {
        return JSON.stringify({ active_operations: [] });
      }
      if (filePath.includes("ownership_snapshot.json")) {
        return "invalid json";
      }
      return "";
    });
    (fs.existsSync as any).mockReturnValue(true);

    const ctx = assembleContext();
    expect(ctx.ownership).toBeNull();
  });

  it("throws when current_state.json is empty", () => {
    (fs.readFileSync as any).mockImplementation((filePath: string) => {
      if (filePath.includes("current_state.json")) {
        return "";
      }
      if (filePath.includes("constitution.md")) {
        return "Constitution.";
      }
      if (filePath.includes("crisis_handbook.txt")) {
        return "Handbook.";
      }
      if (filePath.includes("strategic_ledger.json")) {
        return JSON.stringify({ active_operations: [] });
      }
      return "";
    });
    (fs.existsSync as any).mockReturnValue(true);

    expect(() => assembleContext()).toThrow("empty");
  });

  it("throws when current_state.json is malformed JSON", () => {
    (fs.readFileSync as any).mockImplementation((filePath: string) => {
      if (filePath.includes("current_state.json")) {
        return "not json at all";
      }
      if (filePath.includes("constitution.md")) {
        return "Constitution.";
      }
      if (filePath.includes("crisis_handbook.txt")) {
        return "Handbook.";
      }
      if (filePath.includes("strategic_ledger.json")) {
        return JSON.stringify({ active_operations: [] });
      }
      return "";
    });
    (fs.existsSync as any).mockReturnValue(true);

    expect(() => assembleContext()).toThrow();
  });
});

// ---------------------------------------------------------------------------
// buildPrompt
// ---------------------------------------------------------------------------

describe("buildPrompt", () => {
  beforeEach(() => {
    (fs.existsSync as any).mockImplementation((filePath: string) => {
      if (filePath.includes("system.md")) {
        return false;
      }
      return false;
    });
  });

  const baseContext: BrainContext = {
    gameState: { current_state: "Map: Europe in 2025" },
    ledger: { active_operations: [] },
    advisorResponse: "Japan is weak.",
    ownership: null,
    campaign: null,
    memory: {
      summary: {
        achievements: [],
        failures: [],
        currentPriorities: [],
        historicalContext: "Test context.",
        lastUpdatedTurn: 0,
      },
      rivalProfiles: [],
      lessonsLearned: [],
    },
    strategy: {
      name: "Test Strategy",
      country: "Testland",
      phases: [
        {
          name: "Test Phase",
          description: "Testing",
          entryConditions: ["start"],
          exitConditions: ["done"],
          focusAreas: ["test"],
          minTurns: 1,
        },
      ],
      currentPhaseIndex: 0,
      turnsInCurrentPhase: 0,
    },
  };

  it("returns system and user prompts", () => {
    const { system, user } = buildPrompt(baseContext);

    expect(system).toContain("Strategic AI");
    expect(user).toContain("Map: Europe in 2025");
    expect(user).toContain("Japan is weak.");
  });

  it("includes ownership block when ownership is provided", () => {
    const ctx: BrainContext = {
      ...baseContext,
      ownership: { our_nation: "USA", regions_we_own: ["Alaska", "Texas"] },
    };

    const { user } = buildPrompt(ctx);
    expect(user).toContain("REGIONS WE OWN");
    expect(user).toContain("We are USA");
    expect(user).toContain("Alaska");
    expect(user).toContain("Texas");
  });

  it("does not include ownership block when ownership is null", () => {
    const { user } = buildPrompt(baseContext);
    expect(user).not.toContain("REGIONS WE OWN");
  });

  it("uses default text when advisorResponse is empty", () => {
    const ctx: BrainContext = { ...baseContext, advisorResponse: "" };

    const { user } = buildPrompt(ctx);
    expect(user).toContain("No advisor response available this turn.");
  });

  it("uses default ledger text when ledger is empty", () => {
    const { user } = buildPrompt(baseContext);
    expect(user).toContain("None — this is the first turn");
  });

  it("includes serialized ledger when operations exist", () => {
    const ctx: BrainContext = {
      ...baseContext,
      ledger: {
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
      },
    };

    const { user } = buildPrompt(ctx);
    expect(user).toContain("OP_001");
    expect(user).toContain("Conquer Japan");
    // COMPLETE steps should be filtered out to keep context lean
    expect(user).not.toContain("Embargo");
    expect(user).toContain("Invade");
  });

  it("includes foreign operations policy in system prompt", () => {
    const { system } = buildPrompt(baseContext);
    expect(system).toContain("FOREIGN OPERATIONS POLICY");
    expect(system).toContain("soft power");
  });

  it("includes next_advisor_query instruction in system prompt", () => {
    const { system } = buildPrompt(baseContext);
    expect(system).toContain("next_advisor_query");
  });
});
