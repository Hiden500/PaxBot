/**
 * Unit tests for Campaign: validator.ts
 */
import { describe, it, expect } from "vitest";
import { validateCampaign, isValidCampaign } from "./validator";

describe("validateCampaign", () => {
  const validCampaign = {
    name: "Test Campaign",
    country: "Russia",
    superGoal: "World domination",
    timeHorizon: 50,
    priorities: [
      { area: "military", description: "Build army", weight: 1 },
      { area: "economy", description: "Grow GDP", weight: 2 },
    ],
    constraints: [{ rule: "Avoid nuclear war", severity: "hard" }],
    victoryConditions: [{ id: "gdp_1", description: "GDP rank 1", metric: "gdp_rank", target: 1 }],
  };

  it("returns valid for a correct campaign", () => {
    const result = validateCampaign(validCampaign);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("returns invalid for null", () => {
    const result = validateCampaign(null);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Campaign must be a non-null object");
  });

  it("returns invalid for non-object", () => {
    const result = validateCampaign("string");
    expect(result.valid).toBe(false);
  });

  it("returns errors for missing required string fields", () => {
    const result = validateCampaign({
      timeHorizon: 10,
      priorities: [],
      constraints: [],
      victoryConditions: [],
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("name"))).toBe(true);
    expect(result.errors.some((e) => e.includes("country"))).toBe(true);
    expect(result.errors.some((e) => e.includes("superGoal"))).toBe(true);
  });

  it("returns error for invalid timeHorizon", () => {
    const result = validateCampaign({ ...validCampaign, timeHorizon: 0 });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("timeHorizon"))).toBe(true);
  });

  it("returns error for missing priorities", () => {
    const result = validateCampaign({ ...validCampaign, priorities: "not-array" });
    expect(result.valid).toBe(false);
  });

  it("returns warning for empty priorities", () => {
    const result = validateCampaign({ ...validCampaign, priorities: [] });
    expect(result.valid).toBe(true);
    expect(result.warnings.some((w) => w.includes("priorities"))).toBe(true);
  });

  it("returns error for invalid constraint severity", () => {
    const result = validateCampaign({
      ...validCampaign,
      constraints: [{ rule: "test", severity: "medium" }],
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("severity"))).toBe(true);
  });

  it("returns error for missing victory condition fields", () => {
    const result = validateCampaign({
      ...validCampaign,
      victoryConditions: [{ id: "test" }],
    });
    expect(result.valid).toBe(false);
  });

  it("returns warning for empty victoryConditions", () => {
    const result = validateCampaign({ ...validCampaign, victoryConditions: [] });
    expect(result.valid).toBe(true);
    expect(result.warnings.some((w) => w.includes("victory conditions"))).toBe(true);
  });
});

describe("isValidCampaign", () => {
  it("returns true for valid campaign", () => {
    const result = isValidCampaign({
      name: "Test",
      country: "USA",
      superGoal: "Win",
      timeHorizon: 10,
      priorities: [{ area: "military", description: "Build", weight: 1 }],
      constraints: [{ rule: "No war", severity: "hard" }],
      victoryConditions: [{ id: "v1", description: "Win", metric: "score", target: 100 }],
    });
    expect(result).toBe(true);
  });

  it("returns false for invalid campaign", () => {
    const result = isValidCampaign({ name: "Test" });
    expect(result).toBe(false);
  });
});
