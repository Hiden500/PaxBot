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
    reasoning:
      "Successfully invaded Japan. Defeated their main army. GDP improved this quarter. Failed to capture Okinawa.",
    actions: ["Invade Japan with 3 divisions", "Send diplomats to China"],
    ledger_updates: [],
    milestone_checks: [],
    immediate_risks: [],
  };

  it("extracts achievements from reasoning", () => {
    const result = updateMemoryAfterTurn(emptyMem, sampleBatch, 1);
    expect(result.summary.achievements.length).toBeGreaterThanOrEqual(1);
    expect(
      result.summary.achievements.some((a) => a.description.toLowerCase().includes("invaded"))
    ).toBe(true);
  });

  it("extracts failures from reasoning", () => {
    const result = updateMemoryAfterTurn(emptyMem, sampleBatch, 1);
    expect(result.summary.failures.length).toBeGreaterThanOrEqual(1);
    expect(
      result.summary.failures.some((f) => f.description.toLowerCase().includes("failed"))
    ).toBe(true);
  });

  it("extracts priority keywords from reasoning", () => {
    const batchWithPriorities: ActionBatch = {
      reasoning: "We prioritize expanding economy and focus on military buildup.",
      actions: ["Build factories"],
      ledger_updates: [],
      milestone_checks: [],
      immediate_risks: [],
    };
    const result = updateMemoryAfterTurn(emptyMem, batchWithPriorities, 1);
    expect(result.summary.currentPriorities.length).toBeGreaterThan(0);
  });

  it("updates historical context", () => {
    const result = updateMemoryAfterTurn(emptyMem, sampleBatch, 5);
    expect(result.summary.historicalContext).toContain("Turn 5");
    expect(result.summary.lastUpdatedTurn).toBe(5);
  });

  it("extracts rival nations from actions", () => {
    const result = updateMemoryAfterTurn(emptyMem, sampleBatch, 1);
    expect(result.rivalProfiles.length).toBeGreaterThanOrEqual(1);
    expect(result.rivalProfiles.some((r) => r.nation.toLowerCase() === "japan")).toBe(true);
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
