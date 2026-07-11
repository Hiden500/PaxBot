/**
 * Unit tests for Memory: updater.ts
 */
import { describe, it, expect } from "vitest";
import { updateMemoryAfterTurn, archiveOldLessons } from "./updater";
import { emptyMemory } from "./loader";
import type { ActionBatch } from "../shared";

describe("updateMemoryAfterTurn", () => {
  const emptyMem = emptyMemory();

  const sampleBatch: ActionBatch = {
    reasoning: "Reasoning block on this turn.",
    actions: [
      "Invade Japan with 3 divisions",
      "Послать дипломатов в КНР",
      "Declare war on Germany",
    ],
    ledger_updates: [
      {
        operation_id: "OP_ANNEX",
        goal: "Annex Japan",
        current_phase: 1,
        steps: [
          { phase: 1, action: "Invade Japan", status: "COMPLETE" },
          { phase: 2, action: "Siege Kyoto", status: "PENDING" },
        ],
      },
      {
        operation_id: "OP_COUP",
        goal: "Coup government",
        current_phase: 2,
        steps: [{ phase: 1, action: "Support rebels", status: "FAILED" }],
      },
    ],
    milestone_checks: [
      {
        milestone: "GDP rank Top 10",
        status: "ACHIEVED",
        evidence: "We are rank 8.",
      },
      {
        milestone: "Population 180M",
        status: "FAILED",
        evidence: "We are at 146M.",
      },
    ],
    immediate_risks: ["Economic sanctions from USA", "Угроза НАТО"],
  };

  it("extracts achievements from ledger updates and milestone checks", () => {
    const result = updateMemoryAfterTurn(emptyMem, sampleBatch, 1);
    expect(result.summary.achievements.length).toBe(2); // 1 ledger step + 1 milestone
    expect(result.summary.achievements.some((a) => a.description.includes("Annex Japan"))).toBe(
      true
    );
    expect(result.summary.achievements.some((a) => a.description.includes("GDP rank Top 10"))).toBe(
      true
    );
  });

  it("extracts failures from ledger updates and milestone checks", () => {
    const result = updateMemoryAfterTurn(emptyMem, sampleBatch, 1);
    expect(result.summary.failures.length).toBe(2); // 1 ledger step + 1 milestone
    expect(result.summary.failures.some((f) => f.description.includes("Coup government"))).toBe(
      true
    );
    expect(result.summary.failures.some((f) => f.description.includes("Population 180M"))).toBe(
      true
    );
  });

  it("extracts priorities from ledger updates or risks", () => {
    const result = updateMemoryAfterTurn(emptyMem, sampleBatch, 1);
    expect(result.summary.currentPriorities.length).toBeGreaterThan(0);
    expect(result.summary.currentPriorities[0]).toContain("OP_ANNEX");
  });

  it("updates historical context", () => {
    const result = updateMemoryAfterTurn(emptyMem, sampleBatch, 5);
    expect(result.summary.historicalContext).toContain("Turn 5");
    expect(result.summary.lastUpdatedTurn).toBe(5);
  });

  it("extracts rival nations from actions including Cyrillic / Russian", () => {
    const result = updateMemoryAfterTurn(emptyMem, sampleBatch, 1);
    expect(result.rivalProfiles.length).toBe(3); // Japan, КНР, Germany
    expect(result.rivalProfiles.some((r) => r.nation === "Japan")).toBe(true);
    expect(result.rivalProfiles.some((r) => r.nation === "КНР")).toBe(true);
    expect(result.rivalProfiles.some((r) => r.nation === "Germany")).toBe(true);
  });

  it("does not duplicate achievements", () => {
    const result1 = updateMemoryAfterTurn(emptyMem, sampleBatch, 1);
    const result2 = updateMemoryAfterTurn(result1, sampleBatch, 2);
    const descriptions = result2.summary.achievements.map((a) => a.description);
    const unique = new Set(descriptions);
    expect(unique.size).toBe(descriptions.length);
  });
});

describe("archiveOldLessons", () => {
  it("marks old lessons as irrelevant", () => {
    const lessons = [
      {
        id: "l1",
        lesson: "Test",
        context: "ctx",
        type: "success" as const,
        turn: 1,
        relevant: true,
      },
      {
        id: "l2",
        lesson: "Test2",
        context: "ctx",
        type: "caution" as const,
        turn: 18,
        relevant: true,
      },
    ];
    const result = archiveOldLessons(lessons, 20, 5);
    expect(result.find((l) => l.id === "l1")?.relevant).toBe(false);
    expect(result.find((l) => l.id === "l2")?.relevant).toBe(true);
  });
});
