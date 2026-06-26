/**
 * Campaign: Validator
 *
 * Validates campaign JSON files for correctness and completeness.
 * Ensures all required fields are present and properly typed.
 */

import type { Campaign, ValidationResult } from "./types";

/**
 * Validate a campaign object.
 * Returns a ValidationResult with errors and warnings.
 */
export function validateCampaign(campaign: unknown): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!campaign || typeof campaign !== "object") {
    return { valid: false, errors: ["Campaign must be a non-null object"], warnings: [] };
  }

  const c = campaign as Record<string, unknown>;

  // Required string fields
  const stringFields = ["name", "country", "superGoal"] as const;
  for (const field of stringFields) {
    if (!c[field] || typeof c[field] !== "string") {
      errors.push(`Missing or invalid required string field: "${field}"`);
    }
  }

  // timeHorizon
  if (typeof c.timeHorizon !== "number" || c.timeHorizon < 1) {
    errors.push(`"timeHorizon" must be a positive number, got ${String(c.timeHorizon)}`);
  }

  // priorities
  if (!Array.isArray(c.priorities)) {
    errors.push(`"priorities" must be an array`);
  } else if (c.priorities.length === 0) {
    warnings.push("No priorities defined — agent may lack strategic direction");
  } else {
    for (let i = 0; i < c.priorities.length; i++) {
      const p = c.priorities[i];
      if (!p || typeof p !== "object") {
        errors.push(`priorities[${i}] must be an object`);
        continue;
      }
      const priority = p as Record<string, unknown>;
      if (!priority.area || typeof priority.area !== "string") {
        errors.push(`priorities[${i}].area must be a non-empty string`);
      }
      if (!priority.description || typeof priority.description !== "string") {
        errors.push(`priorities[${i}].description must be a non-empty string`);
      }
      if (typeof priority.weight !== "number" || priority.weight < 1) {
        errors.push(`priorities[${i}].weight must be a positive number`);
      }
    }
  }

  // constraints
  if (!Array.isArray(c.constraints)) {
    errors.push(`"constraints" must be an array`);
  } else {
    for (let i = 0; i < c.constraints.length; i++) {
      const cn = c.constraints[i];
      if (!cn || typeof cn !== "object") {
        errors.push(`constraints[${i}] must be an object`);
        continue;
      }
      const constraint = cn as Record<string, unknown>;
      if (!constraint.rule || typeof constraint.rule !== "string") {
        errors.push(`constraints[${i}].rule must be a non-empty string`);
      }
      if (!["soft", "hard"].includes(constraint.severity as string)) {
        errors.push(`constraints[${i}].severity must be "soft" or "hard"`);
      }
    }
  }

  // victoryConditions
  if (!Array.isArray(c.victoryConditions)) {
    errors.push(`"victoryConditions" must be an array`);
  } else if (c.victoryConditions.length === 0) {
    warnings.push("No victory conditions defined — progress cannot be measured");
  } else {
    for (let i = 0; i < c.victoryConditions.length; i++) {
      const vc = c.victoryConditions[i];
      if (!vc || typeof vc !== "object") {
        errors.push(`victoryConditions[${i}] must be an object`);
        continue;
      }
      const condition = vc as Record<string, unknown>;
      if (!condition.id || typeof condition.id !== "string") {
        errors.push(`victoryConditions[${i}].id must be a non-empty string`);
      }
      if (!condition.description || typeof condition.description !== "string") {
        errors.push(`victoryConditions[${i}].description must be a non-empty string`);
      }
      if (!condition.metric || typeof condition.metric !== "string") {
        errors.push(`victoryConditions[${i}].metric must be a non-empty string`);
      }
      if (condition.target === undefined || condition.target === null) {
        errors.push(`victoryConditions[${i}].target is required`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Type guard: checks if a value is a valid Campaign.
 */
export function isValidCampaign(value: unknown): value is Campaign {
  return validateCampaign(value).valid;
}
