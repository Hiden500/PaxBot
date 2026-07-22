/**
 * Memory: Types
 *
 * Strategic memory types for long-term retention of game events,
 * rival intel, and lessons learned.
 */

/**
 * A single strategic summary entry — keystone achievement or failure.
 */
export interface StrategicSummaryEntry {
  /** Short identifier (e.g. "conquered_japan_2025"). */
  id: string;
  /** What happened. */
  description: string;
  /** Type of event. */
  type: "achievement" | "failure" | "milestone";
  /** Turn number when this occurred. */
  turn: number;
  /** Year context if available. */
  year?: number;
  /** Tags for categorization. */
  tags?: string[];
}

/**
 * Strategic direction — LLM's own evolving strategic plan, stored in memory.
 * Replaces the static strategy-plan.json and phase progression system.
 */
export interface StrategicDirection {
  /** Narrative description of current strategic direction (LLM-written). */
  narrative: string;
  /** Turn this was last updated. */
  lastUpdatedTurn: number;
}

/**
 * Strategic summary — overall progress snapshot.
 */
export interface StrategicSummary {
  /** Key achievements. */
  achievements: StrategicSummaryEntry[];
  /** Failed initiatives. */
  failures: StrategicSummaryEntry[];
  /** Current strategic priorities (from last turn's reasoning). */
  currentPriorities: string[];
  /** Historical context summary (auto-generated). */
  historicalContext: string;
  /** Strategic direction — LLM's self-authored plan. */
  strategicDirection: StrategicDirection;
  /** Last updated turn. */
  lastUpdatedTurn: number;
}

/**
 * Diplomatic stance toward a nation.
 */
export type DiplomaticStance = "ally" | "neutral" | "hostile" | "puppet" | "conquered";

/**
 * Threat level assessment.
 */
export type ThreatLevel = "none" | "low" | "medium" | "high" | "critical";

/**
 * A rival nation profile.
 */
export interface RivalProfile {
  /** Nation name. */
  nation: string;
  /** Current diplomatic stance. */
  stance: DiplomaticStance;
  /** Threat assessment. */
  threatLevel: ThreatLevel;
  /** Historical interactions (diplomatic actions, wars, alliances). */
  history: string[];
  /** Military capacity estimate (observed rank or strength). */
  militaryCapacity?: string;
  /** Economic strength estimate. */
  economicStrength?: string;
  /** Known alliances. */
  alliances: string[];
  /** Last turn this profile was updated. */
  lastUpdatedTurn: number;
}

/**
 * A lesson learned from game events.
 */
export interface LearnedLesson {
  /** Unique identifier. */
  id: string;
  /** The lesson text. */
  lesson: string;
  /** Context in which this lesson was derived. */
  context: string;
  /** Was this lesson successful or cautionary. */
  type: "success" | "caution";
  /** Turn when learned. */
  turn: number;
  /** Still applicable? */
  relevant: boolean;
}

/**
 * Complete strategic memory state.
 */
export interface StrategicMemory {
  summary: StrategicSummary;
  rivalProfiles: RivalProfile[];
  lessonsLearned: LearnedLesson[];
}
