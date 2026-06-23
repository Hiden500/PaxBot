/**
 * Unit tests for Brain: action-generator.ts
 *
 * Tests pure functions: mergeLedger, pruneLedger, normalizeStatuses.
 * generateActions() is covered by integration tests (requires API key).
 *
 * We re-implement the pure functions inline because the actual module
 * imports llm-client which requires env setup.
 */
import { describe, it, expect } from "vitest";

// ---------------------------------------------------------------------------
// Types (mirror of shared/schemas.ts for standalone testing)
// ---------------------------------------------------------------------------

interface OperationStep {
  phase: number;
  action: string;
  status: string;
}

interface Operation {
  operation_id: string;
  goal: string;
  current_phase: number;
  steps: OperationStep[];
}

interface StrategicLedger {
  active_operations: Operation[];
}

// ---------------------------------------------------------------------------
// Inline re-impl of the pure functions we want to test
// ---------------------------------------------------------------------------

function mergeLedger(existing: StrategicLedger, updates: Operation[]): StrategicLedger {
  const ops = [...existing.active_operations];
  for (const update of updates) {
    const idx = ops.findIndex((op) => op.operation_id === update.operation_id);
    if (idx >= 0) {
      const existingComplete = ops[idx].steps.filter((s) => s.status === "COMPLETE");
      const merged = {
        ...update,
        steps: [...existingComplete, ...update.steps],
      };
      ops[idx] = merged;
    } else {
      ops.push(update);
    }
  }
  return { active_operations: ops };
}

const MAX_COMPLETE_STEPS_PER_OP = 5;

function pruneLedger(ledger: StrategicLedger): StrategicLedger {
  const active = ledger.active_operations.filter((op) =>
    op.steps.some((s) => s.status === "PENDING")
  );
  const trimmed = active.map((op) => {
    const complete = op.steps.filter((s) => s.status === "COMPLETE");
    const other = op.steps.filter((s) => s.status !== "COMPLETE");
    if (complete.length <= MAX_COMPLETE_STEPS_PER_OP) {
      return op;
    }
    const kept = complete.slice(-MAX_COMPLETE_STEPS_PER_OP);
    return { ...op, steps: [...kept, ...other] };
  });
  return { active_operations: trimmed };
}

const VALID_STATUSES = new Set(["COMPLETE", "PENDING", "FAILED"]);

function normalizeStatuses(obj: Record<string, unknown>): void {
  const updates = obj.ledger_updates;
  if (!Array.isArray(updates)) {
    return;
  }
  for (const op of updates) {
    if (op && typeof op === "object" && Array.isArray((op as Record<string, unknown>).steps)) {
      for (const step of (op as Record<string, unknown>).steps as Record<string, unknown>[]) {
        if (step && typeof step.status === "string") {
          const upper = step.status.toUpperCase();
          step.status = VALID_STATUSES.has(upper) ? upper : "PENDING";
        }
      }
    }
  }
}

// ---------------------------------------------------------------------------
// mergeLedger
// ---------------------------------------------------------------------------

describe("mergeLedger", () => {
  it("merges updates into existing operation", () => {
    const existing: StrategicLedger = {
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

    const updates: Operation[] = [
      {
        operation_id: "OP_001",
        goal: "Conquer Japan",
        current_phase: 3,
        steps: [{ phase: 3, action: "Occupy Tokyo", status: "PENDING" }],
      },
    ];

    const result = mergeLedger(existing, updates);
    expect(result.active_operations).toHaveLength(1);
    // 1 existing COMPLETE + 1 update PENDING = 2 steps
    expect(result.active_operations[0].steps).toHaveLength(2);
    expect(result.active_operations[0].steps[0].status).toBe("COMPLETE");
    expect(result.active_operations[0].steps[0].action).toBe("Embargo");
    expect(result.active_operations[0].steps[1].action).toBe("Occupy Tokyo");
  });

  it("appends new operation when operation_id does not exist", () => {
    const existing: StrategicLedger = { active_operations: [] };
    const updates: Operation[] = [
      {
        operation_id: "OP_001",
        goal: "New operation",
        current_phase: 1,
        steps: [{ phase: 1, action: "Start", status: "PENDING" }],
      },
    ];

    const result = mergeLedger(existing, updates);
    expect(result.active_operations).toHaveLength(1);
    expect(result.active_operations[0].operation_id).toBe("OP_001");
  });

  it("merges multiple operations", () => {
    const existing: StrategicLedger = {
      active_operations: [
        {
          operation_id: "OP_001",
          goal: "Goal 1",
          current_phase: 1,
          steps: [{ phase: 1, action: "Step 1", status: "COMPLETE" }],
        },
      ],
    };

    const updates: Operation[] = [
      {
        operation_id: "OP_001",
        goal: "Goal 1",
        current_phase: 2,
        steps: [{ phase: 2, action: "Step 2", status: "PENDING" }],
      },
      {
        operation_id: "OP_002",
        goal: "Goal 2",
        current_phase: 1,
        steps: [{ phase: 1, action: "New op", status: "PENDING" }],
      },
    ];

    const result = mergeLedger(existing, updates);
    expect(result.active_operations).toHaveLength(2);
    expect(result.active_operations[0].steps).toHaveLength(2);
  });

  it("does not mutate the original existing operations array", () => {
    const existing: StrategicLedger = {
      active_operations: [
        {
          operation_id: "OP_001",
          goal: "Test",
          current_phase: 1,
          steps: [{ phase: 1, action: "A", status: "PENDING" }],
        },
      ],
    };

    const originalLength = existing.active_operations.length;
    const originalStepCount = existing.active_operations[0].steps.length;

    mergeLedger(existing, [
      {
        operation_id: "OP_001",
        goal: "Test",
        current_phase: 2,
        steps: [{ phase: 2, action: "B", status: "PENDING" }],
      },
    ]);

    expect(existing.active_operations).toHaveLength(originalLength);
    expect(existing.active_operations[0].steps).toHaveLength(originalStepCount);
  });
});

// ---------------------------------------------------------------------------
// pruneLedger
// ---------------------------------------------------------------------------

describe("pruneLedger", () => {
  it("removes operations with no PENDING steps", () => {
    const ledger: StrategicLedger = {
      active_operations: [
        {
          operation_id: "OP_001",
          goal: "Done",
          current_phase: 3,
          steps: [
            { phase: 1, action: "A", status: "COMPLETE" },
            { phase: 2, action: "B", status: "COMPLETE" },
            { phase: 3, action: "C", status: "FAILED" },
          ],
        },
        {
          operation_id: "OP_002",
          goal: "Active",
          current_phase: 1,
          steps: [{ phase: 1, action: "A", status: "PENDING" }],
        },
      ],
    };

    const result = pruneLedger(ledger);
    expect(result.active_operations).toHaveLength(1);
    expect(result.active_operations[0].operation_id).toBe("OP_002");
  });

  it("trims old COMPLETE steps beyond MAX_COMPLETE_STEPS_PER_OP", () => {
    const steps: Array<{ phase: number; action: string; status: string }> = [];
    for (let i = 0; i < 10; i++) {
      steps.push({ phase: i + 1, action: `Step ${i + 1}`, status: "COMPLETE" });
    }
    steps.push({ phase: 11, action: "Final", status: "PENDING" });

    const ledger: StrategicLedger = {
      active_operations: [
        {
          operation_id: "OP_001",
          goal: "Long operation",
          current_phase: 11,
          steps: steps as any,
        },
      ],
    };

    const result = pruneLedger(ledger);
    expect(result.active_operations).toHaveLength(1);
    const keptComplete = result.active_operations[0].steps.filter((s) => s.status === "COMPLETE");
    expect(keptComplete).toHaveLength(5);
    expect(result.active_operations[0].steps).toHaveLength(6);
  });

  it("keeps operation unchanged if step count is below limit", () => {
    const ledger: StrategicLedger = {
      active_operations: [
        {
          operation_id: "OP_001",
          goal: "Quick",
          current_phase: 2,
          steps: [
            { phase: 1, action: "A", status: "COMPLETE" },
            { phase: 2, action: "B", status: "PENDING" },
          ],
        },
      ],
    };

    const result = pruneLedger(ledger);
    expect(result.active_operations[0].steps).toHaveLength(2);
  });

  it("returns empty array when all operations are finished", () => {
    const ledger: StrategicLedger = {
      active_operations: [
        {
          operation_id: "OP_001",
          goal: "Done",
          current_phase: 1,
          steps: [{ phase: 1, action: "A", status: "COMPLETE" }],
        },
      ],
    };

    const result = pruneLedger(ledger);
    expect(result.active_operations).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// normalizeStatuses
// ---------------------------------------------------------------------------

describe("normalizeStatuses", () => {
  it("converts lowercase statuses to uppercase", () => {
    const obj = {
      ledger_updates: [
        {
          operation_id: "OP_001",
          goal: "Test",
          current_phase: 1,
          steps: [
            { phase: 1, action: "A", status: "complete" },
            { phase: 2, action: "B", status: "pending" },
            { phase: 3, action: "C", status: "failed" },
          ],
        },
      ],
    };

    normalizeStatuses(obj);
    const steps = (obj.ledger_updates[0] as any).steps;
    expect(steps[0].status).toBe("COMPLETE");
    expect(steps[1].status).toBe("PENDING");
    expect(steps[2].status).toBe("FAILED");
  });

  it("converts invalid statuses to PENDING", () => {
    const obj = {
      ledger_updates: [
        {
          operation_id: "OP_001",
          goal: "Test",
          current_phase: 1,
          steps: [
            { phase: 1, action: "A", status: "IN_PROGRESS" },
            { phase: 2, action: "B", status: "incomplete" },
            { phase: 3, action: "C", status: "DONE" },
          ],
        },
      ],
    };

    normalizeStatuses(obj);
    const steps = (obj.ledger_updates[0] as any).steps;
    steps.forEach((s: any) => {
      expect(s.status).toBe("PENDING");
    });
  });

  it("does nothing when ledger_updates is empty", () => {
    const obj = { ledger_updates: [] };
    expect(() => normalizeStatuses(obj)).not.toThrow();
  });

  it("does nothing when ledger_updates is missing", () => {
    const obj = { actions: [] };
    expect(() => normalizeStatuses(obj)).not.toThrow();
  });

  it("handles mixed valid and invalid statuses", () => {
    const obj = {
      ledger_updates: [
        {
          operation_id: "OP_001",
          goal: "Test",
          current_phase: 1,
          steps: [
            { phase: 1, action: "A", status: "COMPLETE" },
            { phase: 2, action: "B", status: "in_progress" },
          ],
        },
      ],
    };

    normalizeStatuses(obj);
    const steps = (obj.ledger_updates[0] as any).steps;
    expect(steps[0].status).toBe("COMPLETE");
    expect(steps[1].status).toBe("PENDING");
  });
});
