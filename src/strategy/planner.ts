/**
 * Strategy: Planner
 *
 * Manages strategic phase progression.
 * Loads the strategy plan from war-room/strategy/ and determines
 * when to transition between phases.
 */

import * as fs from "fs";
import * as path from "path";
import type { StrategyPlan, PhaseAnalysis } from "./types";
import { getSessionDir } from "../shared/session";

function getStrategyPlanPath(): string {
  return path.join(getSessionDir(), "strategy", "strategy-plan.json");
}

// ---------------------------------------------------------------------------
// Default strategy plan
// ---------------------------------------------------------------------------

function defaultStrategyPlan(country = "Unknown"): StrategyPlan {
  return {
    name: "Default Grand Strategy",
    country,
    phases: [
      {
        name: "Stabilization",
        description: "Secure borders, build economy, strengthen military fundamentals.",
        entryConditions: ["Game start or after major defeat"],
        exitConditions: [
          "GDP rank Top 10",
          "Military rank Top 15",
          "No active wars on home territory",
        ],
        focusAreas: ["economy", "military_basics", "internal_stability"],
        minTurns: 5,
      },
      {
        name: "Economic Expansion",
        description: "Grow GDP through trade, resource exports, and industrialization.",
        entryConditions: ["GDP rank Top 10", "Military rank Top 15", "Stable internal situation"],
        exitConditions: ["GDP rank Top 5", "Population > 100M (or growth > 5%)"],
        focusAreas: ["economy", "diplomacy", "technology"],
        minTurns: 8,
      },
      {
        name: "Regional Dominance",
        description: "Establish military and diplomatic dominance over neighboring regions.",
        entryConditions: ["GDP rank Top 5", "Strong military", "Regional rivals weakened"],
        exitConditions: ["Control key bordering regions", "No major regional rivals"],
        focusAreas: ["military_expansion", "diplomacy", "regional_influence"],
        minTurns: 10,
      },
      {
        name: "Global Power Projection",
        description: "Project power globally, challenge superpowers, expand influence worldwide.",
        entryConditions: ["Regional dominance achieved", "GDP rank Top 3", "Military rank Top 3"],
        exitConditions: ["Victory conditions met"],
        focusAreas: ["global_influence", "military_projection", "technology_leadership"],
        minTurns: 5,
      },
    ],
    currentPhaseIndex: 0,
    turnsInCurrentPhase: 0,
  };
}

// ---------------------------------------------------------------------------
// Load / Save
// ---------------------------------------------------------------------------

/**
 * Load the strategy plan from disk. Creates default if not found.
 */
export function loadStrategyPlan(country?: string): StrategyPlan {
  const planPath = getStrategyPlanPath();
  try {
    if (!fs.existsSync(planPath)) {
      console.log("[Strategy] No strategy-plan.json found, creating default");
      const plan = defaultStrategyPlan(country);
      saveStrategyPlan(plan);
      return plan;
    }
    const raw = fs.readFileSync(planPath, "utf-8").trim();
    if (!raw) {
      return defaultStrategyPlan(country);
    }
    const plan = JSON.parse(raw) as StrategyPlan;
    // Ensure phase index is valid
    if (plan.currentPhaseIndex < 0 || plan.currentPhaseIndex >= plan.phases.length) {
      plan.currentPhaseIndex = 0;
    }
    console.log(
      `[Strategy] Loaded plan: "${plan.name}", phase: ${plan.phases[plan.currentPhaseIndex].name} (index ${plan.currentPhaseIndex})`
    );
    return plan;
  } catch (err) {
    console.warn(
      `[Strategy] Failed to load strategy plan: ${(err as Error).message}, using default`
    );
    return defaultStrategyPlan(country);
  }
}

/**
 * Save the strategy plan to disk.
 */
export function saveStrategyPlan(plan: StrategyPlan): void {
  const planPath = getStrategyPlanPath();
  const dir = path.dirname(planPath);
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(planPath, JSON.stringify(plan, null, 2), "utf-8");
    console.log(`[Strategy] Plan saved: "${plan.name}"`);
  } catch (err) {
    console.error(`[Strategy] Failed to save plan: ${(err as Error).message}`);
  }
}

// ---------------------------------------------------------------------------
// Phase analysis (simplified — full KPI-based analysis comes in v4.0)
// ---------------------------------------------------------------------------

/**
 * Analyze which phase we should be in based on current state.
 * For now uses a simple turn-based heuristic. In v4.0 this will use KPI data.
 *
 * @param plan - Current strategy plan
 * @param gameState - Current game state text (for basic keyword matching)
 * @returns PhaseAnalysis with recommendation
 */
export function analyzePhase(plan: StrategyPlan, gameState: string): PhaseAnalysis {
  const currentPhase = plan.phases[plan.currentPhaseIndex];
  const turnsInPhase = plan.turnsInCurrentPhase;

  // Must stay minimum turns
  if (turnsInPhase < currentPhase.minTurns) {
    return {
      recommendedPhaseIndex: plan.currentPhaseIndex,
      reasoning: `Need ${currentPhase.minTurns - turnsInPhase} more turns in "${currentPhase.name}" phase (minimum ${currentPhase.minTurns} turns).`,
      shouldTransition: false,
    };
  }

  // Check exit conditions via simple keyword match
  const stateLower = gameState.toLowerCase();
  let conditionsMet = 0;

  for (const condition of currentPhase.exitConditions) {
    const conditionLower = condition.toLowerCase();
    // Simple heuristic: check for rank improvements
    if (conditionLower.includes("rank")) {
      const rankMatch = conditionLower.match(/rank\s+(top\s+)?(\d+)/i);
      if (rankMatch) {
        // Check if game state mentions this rank
        const targetRank = rankMatch[2];
        const rankPattern = new RegExp(`(rank|#)\\s*${targetRank}[\\s,\\.]`, "i");
        if (rankPattern.test(stateLower)) {
          conditionsMet++;
          continue;
        }
      }
    }
    // Check for keywords
    const keywords = conditionLower
      .replace(/^(no|not|without)\s+/i, "")
      .split(/\s+/)
      .filter((w) => w.length > 3);
    const keywordMatch = keywords.some((kw) => stateLower.includes(kw));
    if (keywordMatch) {
      conditionsMet++;
    }
  }

  const threshold = Math.max(1, Math.ceil(currentPhase.exitConditions.length * 0.5));
  const canTransition = conditionsMet >= threshold;
  const nextIndex = Math.min(plan.currentPhaseIndex + 1, plan.phases.length - 1);

  if (canTransition && nextIndex > plan.currentPhaseIndex) {
    return {
      recommendedPhaseIndex: nextIndex,
      reasoning: `Phase "${currentPhase.name}" exit conditions partially met (${conditionsMet}/${currentPhase.exitConditions.length}). Transitioning to "${plan.phases[nextIndex].name}".`,
      shouldTransition: true,
    };
  }

  if (plan.currentPhaseIndex >= plan.phases.length - 1) {
    return {
      recommendedPhaseIndex: plan.currentPhaseIndex,
      reasoning: `Already in final phase "${currentPhase.name}". Continue until victory.`,
      shouldTransition: false,
    };
  }

  return {
    recommendedPhaseIndex: plan.currentPhaseIndex,
    reasoning: `Continuing "${currentPhase.name}" phase — exit conditions not yet met (${conditionsMet}/${currentPhase.exitConditions.length}).`,
    shouldTransition: false,
  };
}

/**
 * Format the current strategy plan for LLM prompts.
 */
export function formatStrategyForPrompt(plan: StrategyPlan): string {
  const currentPhase = plan.phases[plan.currentPhaseIndex];
  const totalPhases = plan.phases.length;
  const progress = Math.round(((plan.currentPhaseIndex + 1) / totalPhases) * 100);

  const lines: string[] = [
    `=== STRATEGIC PLAN: ${plan.name} ===`,
    `Progress: Phase ${plan.currentPhaseIndex + 1}/${totalPhases} (${progress}%)`,
    ``,
    `Current Phase: ${currentPhase.name}`,
    `  ${currentPhase.description}`,
    `  Focus Areas: ${currentPhase.focusAreas.join(", ")}`,
    `  Turns in phase: ${plan.turnsInCurrentPhase}`,
    `  Exit conditions: ${currentPhase.exitConditions.join("; ")}`,
  ];

  if (plan.currentPhaseIndex < totalPhases - 1) {
    const nextPhase = plan.phases[plan.currentPhaseIndex + 1];
    lines.push(``);
    lines.push(`Next Phase: ${nextPhase.name}`);
    lines.push(`  ${nextPhase.description}`);
    lines.push(`  Entry conditions: ${nextPhase.entryConditions.join("; ")}`);
  }

  lines.push("\n=== END STRATEGIC PLAN ===");
  return lines.join("\n");
}
