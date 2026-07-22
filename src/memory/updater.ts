/**
 * Memory: Updater
 *
 * Updates strategic memory after each turn based on game state
 * and executed actions.
 */

import * as fs from "fs";
import * as path from "path";
import type { StrategicMemory, StrategicSummaryEntry, RivalProfile, LearnedLesson } from "./types";
import type { ActionBatch } from "../shared";
import { extractNationNames } from "../brain/state-digest";
import { getSessionDir } from "../shared/session";
import { PATHS } from "../shared/config";

// ---------------------------------------------------------------------------
// Achievement/Failure extraction from LLM ActionBatch structure (Language-independent)
// ---------------------------------------------------------------------------

/**
 * Extract achievements and failures using structured fields from LLM response (Zod validated).
 */
function extractEntriesFromBatch(batch: ActionBatch, turn: number): StrategicSummaryEntry[] {
  const entries: StrategicSummaryEntry[] = [];

  // 1. Process steps in ledger_updates (operations)
  if (batch.ledger_updates) {
    for (const op of batch.ledger_updates) {
      for (const step of op.steps) {
        if (step.status === "COMPLETE") {
          entries.push({
            id: `turn_${turn}_ach_${entries.length}`,
            description: `Operation [${op.operation_id}] "${op.goal}": ${step.action}`,
            type: "achievement",
            turn,
            tags: ["operation", op.operation_id.toLowerCase()],
          });
        } else if (step.status === "FAILED") {
          entries.push({
            id: `turn_${turn}_fail_${entries.length}`,
            description: `Operation [${op.operation_id}] "${op.goal}" FAILED on step: ${step.action}`,
            type: "failure",
            turn,
            tags: ["operation", op.operation_id.toLowerCase()],
          });
        }
      }
    }
  }

  // 2. Process milestone checks
  if (batch.milestone_checks) {
    for (const check of batch.milestone_checks) {
      if (check.status === "ACHIEVED") {
        entries.push({
          id: `turn_${turn}_ach_${entries.length}`,
          description: `Milestone achieved: "${check.milestone}". Evidence: ${check.evidence}`,
          type: "milestone",
          turn,
          tags: ["milestone"],
        });
      } else if (check.status === "FAILED") {
        entries.push({
          id: `turn_${turn}_fail_${entries.length}`,
          description: `Milestone FAILED: "${check.milestone}". Evidence: ${check.evidence}`,
          type: "failure",
          turn,
          tags: ["milestone"],
        });
      }
    }
  }

  return entries;
}

// ---------------------------------------------------------------------------
// Rival profile updates — uses known nations from game state
// ---------------------------------------------------------------------------

/**
 * Fallback list of major nations for test/fallback scenarios when game state is unavailable.
 */
const FALLBACK_KNOWN_NATIONS = new Set([
  "japan",
  "кнр",
  "china",
  "germany",
  "united states of america",
  "russian federation",
  "russia",
  "belarus",
  "kazakhstan",
  "ukraine",
  "france",
  "united kingdom",
  "turkey",
  "iran",
  "afghanistan",
  "chechnya",
]);

/**
 * Load known nation names from the current game state for validation.
 * Falls back to a static list if game state is unavailable (e.g., in tests).
 */
function getKnownNations(): Set<string> {
  const statePath = path.join(getSessionDir(), PATHS.CURRENT_STATE);
  try {
    if (fs.existsSync(statePath)) {
      const raw = fs.readFileSync(statePath, "utf-8");
      const parsed = JSON.parse(raw);
      if (parsed.current_state) {
        const names = extractNationNames(parsed.current_state);
        return new Set(names.map((n) => n.toLowerCase()));
      }
    }
  } catch {
    // ignore
  }
  // Fallback: return major known nations for tests and edge cases
  return FALLBACK_KNOWN_NATIONS;
}

/**
 * Update rival profiles based on actions taken this turn.
 * Validates candidates against known nations from the game state.
 */
function updateRivalProfiles(
  profiles: RivalProfile[],
  batch: ActionBatch,
  turn: number
): RivalProfile[] {
  const updated = [...profiles];
  const knownNations = getKnownNations();
  const nationsMentioned = new Set<string>();

  for (const action of batch.actions) {
    // Check each known nation: does the action mention it?
    for (const knownName of knownNations) {
      if (action.toLowerCase().includes(knownName)) {
        nationsMentioned.add(knownName);
      }
    }
  }

  // Update or create profiles for found nations
  for (const nation of nationsMentioned) {
    const existing = updated.find((p) => p.nation.toLowerCase() === nation.toLowerCase());
    if (existing) {
      existing.lastUpdatedTurn = turn;
    } else {
      updated.push({
        nation,
        stance: "neutral",
        threatLevel: "low",
        history: [],
        alliances: [],
        lastUpdatedTurn: turn,
      });
    }
  }

  return updated;
}

// ---------------------------------------------------------------------------
// Main update function
// ---------------------------------------------------------------------------

/**
 * Update strategic memory after a turn's actions are processed.
 *
 * @param memory - Current strategic memory.
 * @param batch - The action batch from this turn.
 * @param turn - Current turn number.
 * @returns Updated StrategicMemory.
 */
export function updateMemoryAfterTurn(
  memory: StrategicMemory,
  batch: ActionBatch,
  turn: number
): StrategicMemory {
  const updated = { ...memory };
  const summary = { ...memory.summary };

  // Extract entries from batch structure (Zod enums), language-agnostic
  const newEntries = extractEntriesFromBatch(batch, turn);

  // Split into achievements and failures
  for (const entry of newEntries) {
    if (entry.type === "achievement" || entry.type === "milestone") {
      // Avoid duplicates
      if (!summary.achievements.some((a) => a.description === entry.description)) {
        summary.achievements = [...summary.achievements, entry];
      }
    } else if (entry.type === "failure") {
      if (!summary.failures.some((f) => f.description === entry.description)) {
        summary.failures = [...summary.failures, entry];
      }
    }
  }

  // Update current priorities directly from ledger_updates goals
  if (batch.ledger_updates && batch.ledger_updates.length > 0) {
    summary.currentPriorities = batch.ledger_updates
      .slice(0, 3)
      .map((op) => `[OP: ${op.operation_id}] ${op.goal}`);
  } else if (batch.immediate_risks && batch.immediate_risks.length > 0) {
    summary.currentPriorities = batch.immediate_risks.slice(0, 3).map((r) => `[Risk] ${r}`);
  }

  // Update historical context — full text, no truncation
  if (batch.actions.length > 0) {
    const firstAction = batch.actions[0];
    summary.historicalContext = `Turn ${turn}: Executed ${batch.actions.length} action(s). Reasoning: ${batch.reasoning}. First action: ${firstAction}`;
  }

  // Update strategic direction from LLM's self-authored plan
  if (batch.strategic_direction_update?.trim()) {
    summary.strategicDirection = {
      narrative: batch.strategic_direction_update.trim(),
      lastUpdatedTurn: turn,
    };
  }

  summary.lastUpdatedTurn = turn;

  // Update rival profiles
  const rivalProfiles = updateRivalProfiles(memory.rivalProfiles, batch, turn);

  return {
    ...updated,
    summary,
    rivalProfiles,
  };
}

/**
 * Mark old lessons as irrelevant.
 */
export function archiveOldLessons(
  lessons: LearnedLesson[],
  currentTurn: number,
  maxAge: number
): LearnedLesson[] {
  return lessons.map((l) => ({
    ...l,
    relevant: l.relevant && currentTurn - l.turn <= maxAge,
  }));
}
