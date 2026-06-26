/**
 * Campaign: Types
 *
 * Structured campaign definition for Pax-Automata.
 * Replaces the need to hardcode strategy in prompts.
 */

/**
 * Victory condition for a campaign.
 */
export interface VictoryCondition {
  /** Short identifier (e.g. "control_europe", "gdp_rank_1"). */
  id: string;
  /** Human-readable description. */
  description: string;
  /** How to measure progress toward this condition. */
  metric: string;
  /** Target value to achieve. */
  target: number | string;
  /** Current value (updated per turn). */
  current?: number | string;
}

/**
 * Strategic priority for a campaign.
 */
export interface Priority {
  /** Area of focus (e.g. "military", "economy", "diplomacy"). */
  area: string;
  /** Description of the priority. */
  description: string;
  /** Relative importance (1 = highest). */
  weight: number;
}

/**
 * Constraint on the agent's actions.
 */
export interface Constraint {
  /** What to avoid or enforce. */
  rule: string;
  /** Severity if violated (soft = warning, hard = blocker). */
  severity: "soft" | "hard";
}

/**
 * Structured campaign definition.
 */
export interface Campaign {
  /** Unique name for this campaign. */
  name: string;
  /** The starting/controlled country. */
  country: string;
  /** The ultimate strategic goal. */
  superGoal: string;
  /** Strategic time horizon in years (e.g. 10, 20, 50). */
  timeHorizon: number;
  /** Ordered list of strategic priorities. */
  priorities: Priority[];
  /** Constraints on the agent's actions. */
  constraints: Constraint[];
  /** Victory conditions to track. */
  victoryConditions: VictoryCondition[];
  /** Starting year context. */
  startYear?: number;
  /** Optional tags for categorization. */
  tags?: string[];
}

/**
 * Schema validation result.
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}
