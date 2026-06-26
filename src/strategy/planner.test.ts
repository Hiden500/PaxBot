/**
 * Unit tests for Strategy: planner.ts
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as fs from "fs";

vi.mock("fs", () => ({
  readFileSync: vi.fn(),
  existsSync: vi.fn(),
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn(),
}));

import { loadStrategyPlan, analyzePhase, formatStrategyForPrompt } from "./planner";
import type { StrategyPlan } from "./types";

describe("loadStrategyPlan", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a default plan when no file exists", () => {
    (fs.existsSync as any).mockReturnValue(false);

    const plan = loadStrategyPlan("Russia");

    expect(plan.name).toBe("Default Grand Strategy");
    expect(plan.country).toBe("Russia");
    expect(plan.phases.length).toBe(4);
    expect(plan.currentPhaseIndex).toBe(0);
    expect(plan.phases[0].name).toBe("Stabilization");
  });

  it("loads an existing plan from disk", () => {
    (fs.existsSync as any).mockReturnValue(true);
    (fs.readFileSync as any).mockReturnValue(
      JSON.stringify({
        name: "Custom Plan",
        country: "USA",
        phases: [
          {
            name: "Phase 1",
            description: "Test",
            entryConditions: [],
            exitConditions: [],
            focusAreas: [],
            minTurns: 1,
          },
        ],
        currentPhaseIndex: 0,
        turnsInCurrentPhase: 0,
      })
    );

    const plan = loadStrategyPlan("USA");

    expect(plan.name).toBe("Custom Plan");
    expect(plan.country).toBe("USA");
  });

  it("resets invalid phase index to 0", () => {
    (fs.existsSync as any).mockReturnValue(true);
    (fs.readFileSync as any).mockReturnValue(
      JSON.stringify({
        name: "Broken",
        country: "X",
        phases: [
          {
            name: "P1",
            description: "Test",
            entryConditions: [],
            exitConditions: [],
            focusAreas: [],
            minTurns: 1,
          },
        ],
        currentPhaseIndex: 5,
        turnsInCurrentPhase: 0,
      })
    );

    const plan = loadStrategyPlan();
    expect(plan.currentPhaseIndex).toBe(0);
  });
});

describe("analyzePhase", () => {
  const defaultPlan: StrategyPlan = {
    name: "Test",
    country: "Testland",
    phases: [
      {
        name: "Stabilization",
        description: "Build up",
        entryConditions: ["Game start"],
        exitConditions: ["GDP rank Top 10", "Internal stability"],
        focusAreas: ["economy"],
        minTurns: 2,
      },
      {
        name: "Expansion",
        description: "Expand",
        entryConditions: ["GDP rank Top 10"],
        exitConditions: ["Control regions"],
        focusAreas: ["military"],
        minTurns: 2,
      },
    ],
    currentPhaseIndex: 0,
    turnsInCurrentPhase: 0,
  };

  it("recommends staying in phase when minTurns not met", () => {
    const result = analyzePhase(defaultPlan, "");
    expect(result.shouldTransition).toBe(false);
    expect(result.reasoning).toContain("Need 2 more turns");
  });

  it("recommends staying when exit conditions not met", () => {
    const plan = { ...defaultPlan, turnsInCurrentPhase: 5 };
    // Text without any matching keywords for exit conditions
    const result = analyzePhase(plan, "xyzzy nothing matches here");
    expect(result.shouldTransition).toBe(false);
  });

  it("recommends transition when exit conditions are met", () => {
    const plan = { ...defaultPlan, turnsInCurrentPhase: 5 };
    const result = analyzePhase(plan, "GDP rank #10 achieved, internal stability high");
    expect(result.shouldTransition).toBe(true);
    expect(result.recommendedPhaseIndex).toBe(1);
  });

  it("stays in final phase", () => {
    const plan: StrategyPlan = {
      ...defaultPlan,
      currentPhaseIndex: 1,
      turnsInCurrentPhase: 10,
    };
    const result = analyzePhase(plan, "Anything");
    expect(result.shouldTransition).toBe(false);
    expect(result.reasoning).toContain("final phase");
  });
});

describe("formatStrategyForPrompt", () => {
  it("formats plan with current phase info", () => {
    const plan: StrategyPlan = {
      name: "Grand Plan",
      country: "Russia",
      phases: [
        {
          name: "Phase 1",
          description: "First",
          entryConditions: [],
          exitConditions: ["done"],
          focusAreas: ["a"],
          minTurns: 1,
        },
      ],
      currentPhaseIndex: 0,
      turnsInCurrentPhase: 3,
    };

    const formatted = formatStrategyForPrompt(plan);
    expect(formatted).toContain("STRATEGIC PLAN");
    expect(formatted).toContain("Grand Plan");
    expect(formatted).toContain("Phase 1/1");
    expect(formatted).toContain("100%");
    expect(formatted).toContain("3");
  });

  it("includes next phase info when not in final phase", () => {
    const plan: StrategyPlan = {
      name: "Multi",
      country: "X",
      phases: [
        {
          name: "First",
          description: "Start",
          entryConditions: [],
          exitConditions: [],
          focusAreas: [],
          minTurns: 1,
        },
        {
          name: "Second",
          description: "Next",
          entryConditions: ["grow"],
          exitConditions: [],
          focusAreas: [],
          minTurns: 1,
        },
      ],
      currentPhaseIndex: 0,
      turnsInCurrentPhase: 1,
    };

    const formatted = formatStrategyForPrompt(plan);
    expect(formatted).toContain("Next Phase: Second");
    expect(formatted).toContain("grow");
  });
});
