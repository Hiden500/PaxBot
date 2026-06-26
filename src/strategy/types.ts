/**
 * Strategy: Types
 *
 * Strategic phases for long-term planning consistency.
 * Prevents irrational long-term planning by defining phase transitions.
 */

/**
 * A named strategic phase with entry/exit conditions.
 */
export interface StrategicPhase {
  /** Phase name (e.g. "Stabilization"). */
  name: string;
  /** Short description of what this phase entails. */
  description: string;
  /** Conditions that must be met to enter this phase. */
  entryConditions: string[];
  /** Conditions that indicate it's time to exit this phase. */
  exitConditions: string[];
  /** Priority focus areas during this phase. */
  focusAreas: string[];
  /** Minimum turns to stay in this phase (avoid ping-pong). */
  minTurns: number;
}

/**
 * Complete strategy plan with phase progression.
 */
export interface StrategyPlan {
  /** Plan name. */
  name: string;
  /** Target country. */
  country: string;
  /** Ordered list of phases to progress through. */
  phases: StrategicPhase[];
  /** Current phase index in the phases array. */
  currentPhaseIndex: number;
  /** How many turns we've been in the current phase. */
  turnsInCurrentPhase: number;
}

/**
 * Strategy analysis result — what phase we should be in.
 */
export interface PhaseAnalysis {
  /** The recommended phase index. */
  recommendedPhaseIndex: number;
  /** Why this phase is recommended. */
  reasoning: string;
  /** Should the phase change? */
  shouldTransition: boolean;
}
