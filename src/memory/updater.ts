/**
 * Memory: Updater
 *
 * Updates strategic memory after each turn based on game state
 * and executed actions.
 */

import type { StrategicMemory, StrategicSummaryEntry, RivalProfile, LearnedLesson } from "./types";
import type { ActionBatch } from "../shared";

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
// Rival profile updates (Unicode-compatible for Cyrillic/Russian and English)
// ---------------------------------------------------------------------------

/**
 * Common Russian/English stopwords in geopolitics to avoid treating them as country names.
 */
const GEOPOLITICAL_STOPWORDS = new Set([
  "the",
  "our",
  "their",
  "this",
  "that",
  "these",
  "those",
  "наш",
  "наша",
  "наше",
  "наши",
  "этот",
  "эта",
  "это",
  "эти",
  "союз",
  "союзник",
  "соперник",
  "враг",
  "страна",
  "государство",
  "война",
  "мир",
  "договор",
  "альянс",
  "армия",
  "флот",
  "invade",
  "attack",
  "declare",
  "sanction",
  "ally",
  "negotiate",
  "send",
  "build",
  "mobilize",
  "annex",
  "support",
  "with",
  "divisions",
  "war",
  "peace",
  "diplomats",
  "to",
  "вторгнуться",
  "напасть",
  "объявить",
  "санкции",
  "союзник",
  "переговоры",
  "отправить",
  "послать",
  "построить",
  "мобилизовать",
  "аннексировать",
  "поддержать",
  "войну",
  "мир",
  "дипломатов",
  "в",
  "на",
  "для",
]);

/**
 * Update rival profiles based on actions taken this turn.
 * Supports Cyrillic and Latin names using Unicode properties.
 */
function updateRivalProfiles(
  profiles: RivalProfile[],
  batch: ActionBatch,
  turn: number
): RivalProfile[] {
  const updated = [...profiles];
  const nationsMentioned = new Set<string>();

  // Regex using Unicode properties: match capitalized Latin or Cyrillic words
  // supporting single capitalized word, title case word, or fully capitalized acronyms (like USA, КНР)
  const nationRegex = /(?:^|[^0-9\p{L}])([\p{Lu}][\p{L}]+|[\p{Lu}]{2,})(?=[^0-9\p{L}]|$)/gu;

  for (const action of batch.actions) {
    let match: RegExpExecArray | null;
    nationRegex.lastIndex = 0;
    while ((match = nationRegex.exec(action)) !== null) {
      const candidate = match[1].trim();
      const lowerCandidate = candidate.toLowerCase();
      // Skip if candidate is a stopword or too short
      if (candidate.length >= 2 && !GEOPOLITICAL_STOPWORDS.has(lowerCandidate)) {
        nationsMentioned.add(candidate);
      }
    }
  }

  // Update or create profiles for mentioned nations
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

  // Update historical context
  if (batch.actions.length > 0) {
    const recentAction = batch.actions[0].slice(0, 100);
    summary.historicalContext = `Turn ${turn}: Executed ${batch.actions.length} action(s). Reasoning: ${batch.reasoning.slice(0, 200)}. First action: ${recentAction}...`;
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
