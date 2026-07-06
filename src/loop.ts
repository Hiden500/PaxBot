import type { Page } from "playwright";
import * as fs from "fs";
import * as path from "path";
import { BROWSER_CONFIG, PATHS } from "./shared/config";
import { getSessionDir, tui } from "./shared";
import { loadMemory, saveMemory, updateMemoryAfterTurn } from "./memory";
import {
  clickNextTurn,
  enterAction,
  enterAdvisorQuery,
  firstFewSentences,
  getLastAdvisorResponseText,
} from "./hand";
import {
  captureNextSimpleChatRequestBody,
  writeAdvisorResponse,
  writeGameStateFromPayload,
} from "./spy";
import { generateActions } from "./brain";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Default advisor question when no dynamic suggestion exists yet (e.g. turn 1). */
const DEFAULT_ADVISOR_QUERY =
  "What is our current position and what do you advise for our next actions?";

/** Advisor query for this turn: dynamic (from last Brain suggestion) or default. */
export function getAdvisorQueryForTurn(): string {
  const nextQueryPath = path.join(getSessionDir(), PATHS.NEXT_ADVISOR_QUERY);
  try {
    if (fs.existsSync(nextQueryPath)) {
      const q = fs.readFileSync(nextQueryPath, "utf-8").trim();
      if (q) {
        return q;
      }
    }
  } catch {
    // ignore read errors, fall back to default
  }
  return DEFAULT_ADVISOR_QUERY;
}

/** Save ledger and state to timestamped snapshots for recovery. */
export function saveLedgerSnapshot(turnNumber: number): void {
  const sessionDir = getSessionDir();
  try {
    const src = path.join(sessionDir, PATHS.STRATEGIC_LEDGER);
    if (fs.existsSync(src)) {
      const dst = path.join(sessionDir, `ledger_snapshot_turn_${turnNumber}.json`);
      fs.copyFileSync(src, dst);
      console.log(`[Shutdown] Ledger snapshot saved → ${dst}`);
    }
    const state = path.join(sessionDir, PATHS.CURRENT_STATE);
    if (fs.existsSync(state)) {
      const dst = path.join(sessionDir, `state_snapshot_turn_${turnNumber}.json`);
      fs.copyFileSync(state, dst);
      console.log(`[Shutdown] State snapshot saved → ${dst}`);
    }
  } catch (err) {
    console.error("[Shutdown] Failed to save snapshot:", (err as Error).message);
  }
}

/**
 * Runs a single cognitive turn: Perception -> Reasoning -> Execution -> Memory Update.
 */
export async function runTurn(page: Page, turnNumber: number): Promise<void> {
  tui.setTurn(turnNumber);

  const memory = loadMemory();
  tui.setLessons(memory.lessonsLearned.length);

  // ── Phase 1: Perception ──────────────────────────────────────────────
  tui.setStatus(`[Turn ${turnNumber}] Querying advisor & capturing state...`);

  // Start Spy capture BEFORE triggering the advisor query
  const bodyPromise = captureNextSimpleChatRequestBody(page);
  const advisorQuery = getAdvisorQueryForTurn();
  if (advisorQuery !== DEFAULT_ADVISOR_QUERY) {
    tui.log(`[Phase 1] Advisor query: ${advisorQuery.slice(0, 70)}...`);
  }
  await enterAdvisorQuery(page, advisorQuery);

  // Await the intercepted request body
  const requestBody = await bodyPromise;
  writeGameStateFromPayload(requestBody);

  // Poll for the advisor's response text
  const advisorText = await getLastAdvisorResponseText(page);
  writeAdvisorResponse(advisorText);
  if (advisorText) {
    tui.setAdvisorResponse(advisorText);
    tui.log(`[Phase 1] Advisor says: ${firstFewSentences(advisorText)}`);
  }

  // ── Phase 2+3: Brain ────────────────────────────────────────────────
  tui.setStatus(`[Turn ${turnNumber}] Running Brain (LLM)...`);
  tui.log("[Phase 2+3] Running Brain (LLM reasoning)...");
  const batch = await generateActions();

  tui.setReasoning(batch.reasoning);
  tui.setActions(batch.actions);
  tui.setMilestoneChecks(batch.milestone_checks || []);
  tui.setImmediateRisks(batch.immediate_risks || []);

  // ── Phase 4: Execution ──────────────────────────────────────────────
  tui.setStatus(`[Turn ${turnNumber}] Submitting ${batch.actions.length} actions...`);
  tui.log(`[Phase 4] Submitting ${batch.actions.length} actions...`);
  let submitted = 0;
  for (let i = 0; i < batch.actions.length; i++) {
    try {
      await enterAction(page, batch.actions[i]);
      submitted++;
    } catch (err) {
      tui.log(
        `[Phase 4] SKIPPED action ${i + 1} (panel blocked): ${(err as Error).message?.slice(0, 80)}`
      );
    }
    if (i < batch.actions.length - 1) {
      await sleep(BROWSER_CONFIG.ACTION_DELAY_MS);
    }
  }
  tui.log(`[Phase 4] Done — ${submitted}/${batch.actions.length} actions submitted.`);

  // ── Phase 5: Memory update ─────────────────────────────────────────
  try {
    const updatedMemory = updateMemoryAfterTurn(memory, batch, turnNumber);
    saveMemory(updatedMemory);
    tui.setLessons(updatedMemory.lessonsLearned.length);
    tui.log(
      `[Phase 5] Memory updated (${updatedMemory.summary.achievements.length} achievements, ${updatedMemory.rivalProfiles.length} profiles)`
    );
  } catch (err) {
    tui.log(`[Phase 5] Memory update failed: ${(err as Error).message}`);
  }
}

/**
 * The main cognitive loop that advances turns indefinitely until stopped.
 */
export async function runCognitiveLoop(page: Page): Promise<void> {
  let turnNumber = 1;
  let stopping = false;

  // Graceful shutdown on Ctrl+C
  process.on("SIGINT", () => {
    if (stopping) {
      process.exit(1);
    }
    stopping = true;
    console.log("\nCtrl+C received — saving state then shutting down...");
    saveLedgerSnapshot(turnNumber);
  });

  try {
    while (!stopping) {
      try {
        await runTurn(page, turnNumber);
      } catch (err) {
        console.error(
          `\n[Turn ${turnNumber}] ERROR — skipping to next turn:`,
          (err as Error).message?.slice(0, 120)
        );
      }

      if (stopping) {
        break;
      }

      // Auto-advance to next turn
      tui.setStatus(`[Turn ${turnNumber}] Advancing turn...`);
      tui.log(`[Turn Advance] Advancing to next turn (Turn ${turnNumber + 1})...`);
      await clickNextTurn(page);
      turnNumber++;
    }
  } catch (err) {
    tui.log(`Fatal loop error: ${(err as Error).message}`);
  } finally {
    saveLedgerSnapshot(turnNumber);
  }
}
