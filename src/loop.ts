import type { Page } from "playwright";
import * as fs from "fs";
import * as path from "path";
import { BROWSER_CONFIG, PATHS } from "./shared/config";
import { getSessionDir, tui } from "./shared";
import { loadMemory, saveMemory, updateMemoryAfterTurn } from "./memory";
import { getPrimaryCampaign } from "./campaign";
import {
  clickNextTurn,
  enterAction,
  enterAdvisorQuery,
  firstFewSentences,
  getLastAdvisorResponseText,
} from "./hand";
import {
  captureNextSimpleChatRequestBody,
  captureNextSimpleChatResponse,
  writeAdvisorResponse,
  writeGameStateFromPayload,
} from "./spy";
import { generateActions } from "./brain";
import { t } from "./shared/i18n";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Default advisor question when no dynamic suggestion exists yet (e.g. turn 1). */
const DEFAULT_ADVISOR_QUERY_EN =
  "What is our current position and what do you advise for our next actions?";
const DEFAULT_ADVISOR_QUERY_RU =
  "Каково наше текущее положение и что вы посоветуете для наших следующих действий?";

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
  const agentLang = (process.env.AGENT_LANGUAGE || "Russian").toLowerCase();
  return agentLang === "russian" ? DEFAULT_ADVISOR_QUERY_RU : DEFAULT_ADVISOR_QUERY_EN;
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
  tui.setStatus(`[Turn ${turnNumber}] ${t("phase1.start")}`);

  // Start Spy capture BEFORE triggering the advisor query
  const bodyPromise = captureNextSimpleChatRequestBody(page);
  const responsePromise = captureNextSimpleChatResponse(page);
  const advisorQuery = getAdvisorQueryForTurn();
  const agentLang = (process.env.AGENT_LANGUAGE || "Russian").toLowerCase();
  const defaultQuery =
    agentLang === "russian" ? DEFAULT_ADVISOR_QUERY_RU : DEFAULT_ADVISOR_QUERY_EN;
  if (advisorQuery !== defaultQuery) {
    tui.log(`[Phase 1] ${t("phase1.advisor")}: ${advisorQuery.slice(0, 70)}...`);
  }
  await enterAdvisorQuery(page, advisorQuery);

  // Await the intercepted request body (Request Payload for building game state)
  const requestBody = await bodyPromise;
  writeGameStateFromPayload(requestBody);

  // Await the intercepted response body (Game response payload containing mapChanges/events)
  const responseBody = await responsePromise;
  if (responseBody) {
    try {
      const parsedResponse = JSON.parse(responseBody);
      tui.setRawGameState(JSON.stringify(parsedResponse, null, 2));
    } catch {
      tui.setRawGameState(responseBody);
    }
  } else {
    // Fallback to request body if response wasn't captured
    try {
      const parsedState = JSON.parse(requestBody || "{}");
      tui.setRawGameState(JSON.stringify(parsedState, null, 2));
    } catch {
      tui.setRawGameState(requestBody || "{}");
    }
  }

  // Poll for the advisor's response text
  const advisorText = await getLastAdvisorResponseText(page);
  writeAdvisorResponse(advisorText);
  if (advisorText) {
    tui.setAdvisorResponse(advisorText);
    tui.log(`[Phase 1] ${t("phase1.advisor_says")}: ${firstFewSentences(advisorText)}`);
  }

  // ── Phase 2+3: Brain ────────────────────────────────────────────────
  tui.setStatus(`[Turn ${turnNumber}] ${t("phase2.start")}`);
  tui.log(`[Phase 2+3] ${t("phase2.start")}`);
  const batch = await generateActions();

  tui.setReasoning(batch.reasoning);
  tui.setActions(batch.actions);
  tui.setMilestoneChecks(batch.milestone_checks || []);
  tui.setImmediateRisks(batch.immediate_risks || []);

  // ── Phase 4: Execution ──────────────────────────────────────────────
  tui.setStatus(
    `[Turn ${turnNumber}] ${t("phase4.submitting")} ${batch.actions.length} ${t("phase4.actions")}`
  );
  tui.log(`[Phase 4] ${t("phase4.submitting")} ${batch.actions.length} ${t("phase4.actions")}`);
  let submitted = 0;
  for (let i = 0; i < batch.actions.length; i++) {
    try {
      await enterAction(page, batch.actions[i]);
      submitted++;
    } catch (err) {
      tui.log(
        `[Phase 4] ${t("phase4.skipped")} ${i + 1} (panel blocked): ${(err as Error).message?.slice(0, 80)}`
      );
    }
    if (i < batch.actions.length - 1) {
      await sleep(BROWSER_CONFIG.ACTION_DELAY_MS);
    }
  }
  tui.log(`[Phase 4] ${t("phase4.done")} — ${submitted}/${batch.actions.length}`);

  // ── Phase 5: Memory update ─────────────────────────────────────────
  try {
    const updatedMemory = updateMemoryAfterTurn(memory, batch, turnNumber);
    saveMemory(updatedMemory);
    tui.setLessons(updatedMemory.lessonsLearned.length);
    tui.log(
      `[Phase 5] ${t("phase5.memory")} (${updatedMemory.summary.achievements.length} ${t("phase5.achievements")}, ${updatedMemory.rivalProfiles.length} ${t("phase5.profiles")})`
    );
  } catch (err) {
    tui.log(`[Phase 5] ${t("phase5.failed")}: ${(err as Error).message}`);
  }

  // ── Phase 6: (removed) Static strategy plan and phase progression no longer exist.
  // Strategic direction is managed by LLM through memory (strategic_direction_update).
}

/**
 * The main cognitive loop that advances turns indefinitely until stopped.
 */
export async function runCognitiveLoop(page: Page): Promise<void> {
  let turnNumber = 1;
  let stopping = false;

  // Graceful shutdown on Ctrl+C or STOP command
  const handleSigint = () => {
    if (stopping) {
      process.exit(1);
    }
    stopping = true;
    console.log("\nCtrl+C / STOP command received — saving state then shutting down...");
    saveLedgerSnapshot(turnNumber);
  };
  process.on("SIGINT", handleSigint);

  try {
    while (!stopping) {
      // Global Pause check at start of turn
      while (tui.getState().isPaused && !stopping) {
        tui.setStatus(t("log.paused_status") || "Paused");
        await sleep(500);
        if (tui.getState().isStopping) {
          stopping = true;
        }
      }

      if (stopping) {
        break;
      }

      try {
        await runTurn(page, turnNumber);
      } catch (err) {
        console.error(
          `\n[Turn ${turnNumber}] ERROR — pausing execution due to error:`,
          (err as Error).message?.slice(0, 250)
        );
        tui.log(
          t("log.turn_error")
            .replace("{turn}", String(turnNumber))
            .replace("{error}", (err as Error).message)
        );
        // Pause bot immediately on any fatal action generation/validation error
        tui.setPaused(true);
        // Do not advance to next turn - let the user handle or restart
        continue;
      }

      if (stopping) {
        break;
      }

      // Check stopping before next turn wait
      if (tui.getState().isStopping) {
        stopping = true;
      }

      // Semi-Auto Mode Wait
      if (tui.getState().isSemiAuto && !stopping) {
        tui.setStatus(t("log.semi_auto_status").replace("{turn}", String(turnNumber)));
        tui.log(t("log.semi_auto_wait"));
        tui.setPaused(true);
        while (tui.getState().isPaused && !stopping) {
          await sleep(500);
          // Update stopping flag safely
          if (tui.getState().isStopping) {
            stopping = true;
          }
        }
      }

      if (stopping) {
        break;
      }

      // Auto-advance to next turn
      tui.setStatus(t("log.advancing_status").replace("{turn}", String(turnNumber)));
      tui.log(
        t("log.advancing_log")
          .replace("{turn}", String(turnNumber))
          .replace("{nextTurn}", String(turnNumber + 1))
      );
      await clickNextTurn(page);
      turnNumber++;
    }
  } catch (err) {
    tui.log(`${t("err.fatal")} ${(err as Error).message}`);
  } finally {
    // Remove listener to prevent memory leak on multiple restarts
    process.off("SIGINT", handleSigint);
    saveLedgerSnapshot(turnNumber);
  }
}
