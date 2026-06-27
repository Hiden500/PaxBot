/**
 * Unit tests for Zod schemas (shared/schemas.ts).
 * Validates that all JSON boundaries parse/reject correctly.
 */
import { describe, it, expect } from "vitest";
import {
  GameStateSchema,
  OwnershipSnapshotSchema,
  OperationStepSchema,
  OperationSchema,
  StrategicLedgerSchema,
  ActionBatchSchema,
} from "./schemas";

// ---------------------------------------------------------------------------
// GameState
// ---------------------------------------------------------------------------

describe("GameStateSchema", () => {
  it("accepts valid game state", () => {
    const result = GameStateSchema.parse({ current_state: "map data here" });
    expect(result.current_state).toBe("map data here");
  });

  it("accepts empty string", () => {
    const result = GameStateSchema.parse({ current_state: "" });
    expect(result.current_state).toBe("");
  });

  it("rejects missing current_state", () => {
    expect(() => GameStateSchema.parse({})).toThrow();
  });

  it("rejects non-string current_state", () => {
    expect(() => GameStateSchema.parse({ current_state: 123 })).toThrow();
  });
});

// ---------------------------------------------------------------------------
// OwnershipSnapshot
// ---------------------------------------------------------------------------

describe("OwnershipSnapshotSchema", () => {
  it("accepts valid snapshot", () => {
    const result = OwnershipSnapshotSchema.parse({
      our_nation: "USA",
      regions_we_own: ["Alaska", "Hawaii", "Texas"],
    });
    expect(result.our_nation).toBe("USA");
    expect(result.regions_we_own).toHaveLength(3);
  });

  it("accepts empty regions array", () => {
    const result = OwnershipSnapshotSchema.parse({
      our_nation: "USA",
      regions_we_own: [],
    });
    expect(result.regions_we_own).toEqual([]);
  });

  it("rejects missing our_nation", () => {
    expect(() => OwnershipSnapshotSchema.parse({ regions_we_own: [] })).toThrow();
  });

  it("rejects non-array regions_we_own", () => {
    expect(() =>
      OwnershipSnapshotSchema.parse({
        our_nation: "USA",
        regions_we_own: "Alaska",
      })
    ).toThrow();
  });
});

// ---------------------------------------------------------------------------
// OperationStep
// ---------------------------------------------------------------------------

describe("OperationStepSchema", () => {
  const validStep = {
    phase: 1,
    action: "Mobilize forces to border",
    status: "COMPLETE" as const,
  };

  it("accepts COMPLETE status", () => {
    const result = OperationStepSchema.parse(validStep);
    expect(result.status).toBe("COMPLETE");
  });

  it("accepts PENDING status", () => {
    const result = OperationStepSchema.parse({ ...validStep, status: "PENDING" });
    expect(result.status).toBe("PENDING");
  });

  it("accepts FAILED status", () => {
    const result = OperationStepSchema.parse({ ...validStep, status: "FAILED" });
    expect(result.status).toBe("FAILED");
  });

  it("rejects invalid status", () => {
    expect(() => OperationStepSchema.parse({ ...validStep, status: "IN_PROGRESS" })).toThrow();
  });

  it("rejects missing phase", () => {
    expect(() => OperationStepSchema.parse({ action: "test", status: "PENDING" })).toThrow();
  });

  it("rejects negative phase", () => {
    expect(() => OperationStepSchema.parse({ ...validStep, phase: -1 })).toThrow();
  });
});

// ---------------------------------------------------------------------------
// Operation
// ---------------------------------------------------------------------------

describe("OperationSchema", () => {
  const validOp = {
    operation_id: "OP_001",
    goal: "Conquer Japan",
    current_phase: 3,
    steps: [
      { phase: 1, action: "Embargo", status: "COMPLETE" },
      { phase: 2, action: "Sabotage", status: "COMPLETE" },
      { phase: 3, action: "Invade", status: "PENDING" },
    ],
  };

  it("accepts valid operation", () => {
    const result = OperationSchema.parse(validOp);
    expect(result.operation_id).toBe("OP_001");
    expect(result.steps).toHaveLength(3);
  });

  it("accepts operation with no steps", () => {
    const result = OperationSchema.parse({ ...validOp, steps: [] });
    expect(result.steps).toEqual([]);
  });

  it("rejects missing operation_id", () => {
    expect(() => OperationSchema.parse({ goal: "test", current_phase: 1, steps: [] })).toThrow();
  });
});

// ---------------------------------------------------------------------------
// StrategicLedger
// ---------------------------------------------------------------------------

describe("StrategicLedgerSchema", () => {
  it("accepts empty ledger", () => {
    const result = StrategicLedgerSchema.parse({ active_operations: [] });
    expect(result.active_operations).toEqual([]);
  });

  it("accepts ledger with multiple operations", () => {
    const result = StrategicLedgerSchema.parse({
      active_operations: [
        {
          operation_id: "OP_001",
          goal: "Conquer Japan",
          current_phase: 2,
          steps: [{ phase: 1, action: "Embargo", status: "COMPLETE" }],
        },
        {
          operation_id: "OP_002",
          goal: "Weaken Germany",
          current_phase: 1,
          steps: [{ phase: 1, action: "Sabotage", status: "PENDING" }],
        },
      ],
    });
    expect(result.active_operations).toHaveLength(2);
  });

  it("rejects non-array active_operations", () => {
    expect(() => StrategicLedgerSchema.parse({ active_operations: "not an array" })).toThrow();
  });
});

// ---------------------------------------------------------------------------
// ActionBatch
// ---------------------------------------------------------------------------

describe("ActionBatchSchema", () => {
  const validBatch = {
    reasoning: "We need to invade now",
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
    milestone_checks: [],
    immediate_risks: [],
  };

  it("accepts valid batch with all fields", () => {
    const result = ActionBatchSchema.parse(validBatch);
    expect(result.actions).toHaveLength(2);
    expect(result.ledger_updates).toHaveLength(1);
  });

  it("accepts batch with next_advisor_query", () => {
    const result = ActionBatchSchema.parse({
      ...validBatch,
      next_advisor_query: "Should we invade now?",
    });
    expect(result.next_advisor_query).toBe("Should we invade now?");
  });

  it("accepts empty actions array", () => {
    const result = ActionBatchSchema.parse({ ...validBatch, actions: [] });
    expect(result.actions).toEqual([]);
  });

  it("accepts empty ledger_updates array", () => {
    const result = ActionBatchSchema.parse({ ...validBatch, ledger_updates: [] });
    expect(result.ledger_updates).toEqual([]);
  });

  it("rejects missing reasoning", () => {
    expect(() => ActionBatchSchema.parse({ actions: [], ledger_updates: [] })).toThrow();
  });

  it("rejects too long next_advisor_query (>500 chars)", () => {
    expect(() =>
      ActionBatchSchema.parse({
        ...validBatch,
        next_advisor_query: "x".repeat(501),
      })
    ).toThrow();
  });

  it("rejects non-string actions", () => {
    expect(() => ActionBatchSchema.parse({ ...validBatch, actions: [123] })).toThrow();
  });

  it("accepts populated milestone_checks and immediate_risks", () => {
    const result = ActionBatchSchema.parse({
      ...validBatch,
      milestone_checks: [
        { milestone: "Control Berlin", status: "ACHIEVED", evidence: "Berlin is captured" },
      ],
      immediate_risks: ["Economic stagnation"],
    });
    expect(result.milestone_checks).toHaveLength(1);
    expect(result.milestone_checks[0].status).toBe("ACHIEVED");
    expect(result.immediate_risks).toContain("Economic stagnation");
  });

  it("rejects invalid milestone status", () => {
    expect(() =>
      ActionBatchSchema.parse({
        ...validBatch,
        milestone_checks: [
          { milestone: "Control Berlin", status: "INVALID_STATUS", evidence: "Berlin is captured" },
        ],
      })
    ).toThrow();
  });
});
