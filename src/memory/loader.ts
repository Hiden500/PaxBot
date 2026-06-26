/**
 * Memory: Loader
 *
 * Reads and writes strategic memory files (war-room/memory/).
 * Handles graceful fallback when files don't exist yet.
 */

import * as fs from "fs";
import * as path from "path";
import type { StrategicMemory, StrategicSummary, RivalProfile, LearnedLesson } from "./types";
import { PATHS } from "../shared/config";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MEMORY_DIR = path.join(process.cwd(), PATHS.WAR_ROOM, "memory");

const SUMMARY_PATH = path.join(MEMORY_DIR, "strategic_summary.json");
const RIVAL_PROFILES_PATH = path.join(MEMORY_DIR, "rival_profiles.json");
const LESSONS_PATH = path.join(MEMORY_DIR, "lessons_learned.json");

// ---------------------------------------------------------------------------
// Default empty state
// ---------------------------------------------------------------------------

function emptySummary(): StrategicSummary {
  return {
    achievements: [],
    failures: [],
    currentPriorities: [],
    historicalContext: "No historical context yet — campaign just started.",
    lastUpdatedTurn: 0,
  };
}

function emptyMemory(): StrategicMemory {
  return {
    summary: emptySummary(),
    rivalProfiles: [],
    lessonsLearned: [],
  };
}

// ---------------------------------------------------------------------------
// Read helpers
// ---------------------------------------------------------------------------

function readJsonFile<T>(filePath: string, defaultValue: T): T {
  try {
    if (!fs.existsSync(filePath)) {
      return defaultValue;
    }
    const raw = fs.readFileSync(filePath, "utf-8").trim();
    if (!raw) {
      return defaultValue;
    }
    return JSON.parse(raw) as T;
  } catch {
    console.warn(`[Memory] Failed to read ${path.basename(filePath)}, using default`);
    return defaultValue;
  }
}

function writeJsonFile(filePath: string, data: unknown): void {
  try {
    if (!fs.existsSync(MEMORY_DIR)) {
      fs.mkdirSync(MEMORY_DIR, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error(`[Memory] Failed to write ${path.basename(filePath)}: ${(err as Error).message}`);
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Load the full strategic memory from disk.
 * Returns default empty memory if files don't exist.
 */
export function loadMemory(): StrategicMemory {
  const summary = readJsonFile<StrategicSummary>(SUMMARY_PATH, emptySummary());
  const rivalProfiles = readJsonFile<RivalProfile[]>(RIVAL_PROFILES_PATH, []);
  const lessonsLearned = readJsonFile<LearnedLesson[]>(LESSONS_PATH, []);

  return { summary, rivalProfiles, lessonsLearned };
}

/**
 * Save the full strategic memory to disk.
 */
export function saveMemory(memory: StrategicMemory): void {
  writeJsonFile(SUMMARY_PATH, memory.summary);
  writeJsonFile(RIVAL_PROFILES_PATH, memory.rivalProfiles);
  writeJsonFile(LESSONS_PATH, memory.lessonsLearned);
}

/**
 * Format strategic memory as a compact string for LLM prompts.
 */
export function formatMemoryForPrompt(memory: StrategicMemory): string {
  const lines: string[] = [];

  // Strategic summary
  lines.push("=== STRATEGIC MEMORY ===");
  lines.push(`Historical Context: ${memory.summary.historicalContext}`);

  if (memory.summary.achievements.length > 0) {
    lines.push(`\nKey Achievements (${memory.summary.achievements.length}):`);
    for (const a of memory.summary.achievements.slice(-5)) {
      lines.push(`  ✓ ${a.description}`);
    }
  }

  if (memory.summary.failures.length > 0) {
    lines.push(`\nPast Failures (${memory.summary.failures.length}):`);
    for (const f of memory.summary.failures.slice(-3)) {
      lines.push(`  ✗ ${f.description}`);
    }
  }

  if (memory.summary.currentPriorities.length > 0) {
    lines.push(`\nCurrent Priorities:`);
    for (const p of memory.summary.currentPriorities) {
      lines.push(`  • ${p}`);
    }
  }

  // Rival profiles (only high/critical threat)
  const significantRivals = memory.rivalProfiles.filter(
    (r) => r.threatLevel === "high" || r.threatLevel === "critical"
  );
  if (significantRivals.length > 0) {
    lines.push(`\nKey Rivals (high/critical threat):`);
    for (const r of significantRivals) {
      lines.push(`  ⚔ ${r.nation} [${r.stance}] — threat: ${r.threatLevel}`);
      if (r.history.length > 0) {
        lines.push(`    Recent: ${r.history.slice(-2).join("; ")}`);
      }
    }
  }

  // Lessons learned (only relevant ones)
  const relevantLessons = memory.lessonsLearned.filter((l) => l.relevant);
  if (relevantLessons.length > 0) {
    lines.push(`\nLessons Learned (${relevantLessons.length}):`);
    for (const l of relevantLessons) {
      const icon = l.type === "success" ? "✓" : "⚠";
      lines.push(`  ${icon} ${l.lesson}`);
    }
  }

  lines.push("\n=== END STRATEGIC MEMORY ===");

  return lines.join("\n");
}

/**
 * Invalidate any in-memory caches (if added in future).
 */
export function invalidateMemoryCache(): void {
  // No cache yet, but ready for future optimisation
}

export { emptyMemory, emptySummary };
