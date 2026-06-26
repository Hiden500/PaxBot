/**
 * Memory: Updater
 *
 * Updates strategic memory after each turn based on game state
 * and executed actions.
 */

import type { StrategicMemory, StrategicSummaryEntry, RivalProfile, LearnedLesson } from "./types";
import type { ActionBatch } from "../shared";

// ---------------------------------------------------------------------------
// Achievement/Failure extraction from LLM reasoning
// ---------------------------------------------------------------------------

/**
 * Extract potential achievements and failures from the LLM's reasoning text.
 * This is a simple heuristic — full KPI-based extraction comes in v4.0.
 */
function extractEntriesFromReasoning(reasoning: string, turn: number): StrategicSummaryEntry[] {
  const entries: StrategicSummaryEntry[] = [];
  const lower = reasoning.toLowerCase();

  // Success indicators
  const successPatterns = [
    {
      pattern: /successfully\s+(conquered|invaded|captured|annexed|took)\s+([^,.]+)/gi,
      type: "achievement" as const,
    },
    { pattern: /(defeated|destroyed|eliminated)\s+([^,.]+)/gi, type: "achievement" as const },
    {
      pattern: /(gdp|economy|population|military)\s+(grew|improved|increased|ranked)/gi,
      type: "milestone" as const,
    },
  ];

  // Failure indicators
  const failurePatterns = [
    {
      pattern: /(failed|lost|retreated|defeated|pushed\s+back)\s+([^,.]+)/gi,
      type: "failure" as const,
    },
    { pattern: /(suffered|took)\s+(heavy\s+)?(casualties|losses)/gi, type: "failure" as const },
  ];

  for (const { pattern, type } of successPatterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(lower)) !== null) {
      const description = match[0].charAt(0).toUpperCase() + match[0].slice(1);
      const tags = match[0].includes("gdp")
        ? ["economy"]
        : match[0].includes("military")
          ? ["military"]
          : ["military"];
      entries.push({
        id: `turn_${turn}_${type}_${entries.length}`,
        description,
        type,
        turn,
        tags,
      });
    }
  }

  for (const { pattern, type } of failurePatterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(lower)) !== null) {
      const description = match[0].charAt(0).toUpperCase() + match[0].slice(1);
      entries.push({
        id: `turn_${turn}_${type}_${entries.length}`,
        description,
        type,
        turn,
        tags: ["military"],
      });
    }
  }

  return entries;
}

// ---------------------------------------------------------------------------
// Rival profile updates
// ---------------------------------------------------------------------------

/**
 * Update rival profiles based on actions taken this turn.
 */
function updateRivalProfiles(
  profiles: RivalProfile[],
  batch: ActionBatch,
  turn: number
): RivalProfile[] {
  const updated = [...profiles];
  const nationsMentioned = new Set<string>();

  // Extract nation names from actions
  for (const action of batch.actions) {
    const nationMatch = action.match(
      /\b(invade|attack|declare|sanction|ally|negotiate|send)\s+(the\s+)?([A-Z][a-z]+)/i
    );
    if (nationMatch) {
      const nation = nationMatch[3];
      nationsMentioned.add(nation);
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

  // Extract entries from reasoning
  const newEntries = extractEntriesFromReasoning(batch.reasoning, turn);

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

  // Update current priorities from reasoning keywords
  const priorityKeywords = batch.reasoning.match(
    /(prioritize|focus|concentrate|shift)\s+(on|to)?\s+([^.,]+)/gi
  );
  if (priorityKeywords) {
    summary.currentPriorities = priorityKeywords.slice(0, 3).map((p) => p.trim());
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
