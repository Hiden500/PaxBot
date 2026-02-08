/**
 * Pax-Automata — full cognitive loop.
 *
 * Boot → navigate → loop: Advisor query → Spy capture → Brain reasoning → Hand execution → next turn.
 *
 * Run: npm start
 * Optional: GAME_URL=<url> npm start — skip preset flow, go directly to an in-progress game.
 */

import { chromium } from "playwright";
import * as fs from "fs";
import * as path from "path";
import {
  clickNextTurn,
  enterAction,
  enterAdvisorQuery,
  firstFewSentences,
  getLastAdvisorResponseText,
  openPresetAndSelectWW2,
  SELECTORS,
} from "./hand";
import {
  captureNextSimpleChatRequestBody,
  writeAdvisorResponse,
  writeGameStateFromPayload,
} from "./spy";
import { generateActions } from "./brain";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const AUTH_DIR = path.join(process.cwd(), "auth");
const STATE_PATH = path.join(AUTH_DIR, "auth_state.json");
const BASE_URL = "https://www.paxhistoria.co";
const GAME_PAGE_URL = process.env.GAME_URL ?? "";

const ADVISOR_QUERY =
  "What is our current position and what do you advise for our next actions?";
const ACTION_DELAY_MS = 2000;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function ensureAuthState(): void {
  if (!fs.existsSync(STATE_PATH)) {
    console.error("No auth state. Run: npm run capture-auth");
    process.exit(1);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Boot: launch browser, navigate to game
// ---------------------------------------------------------------------------

async function boot() {
  ensureAuthState();

  console.log("[Boot] Launching browser with auth state...");
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({ storageState: STATE_PATH });
  const page = await context.newPage();

  console.log(`[Boot] Navigating to ${BASE_URL}...`);
  await page.goto(BASE_URL, { waitUntil: "load", timeout: 25000 });

  if (GAME_PAGE_URL) {
    console.log(`[Boot] Navigating to game: ${GAME_PAGE_URL}...`);
    await page.goto(GAME_PAGE_URL, {
      waitUntil: "domcontentloaded",
      timeout: 20000,
    });
  } else {
    await openPresetAndSelectWW2(page);
  }

  // Brief wait for game UI to finish rendering (navigation already waited 2.5s)
  await page.waitForTimeout(1000);

  try {
    await page
      .locator(SELECTORS.actionBox)
      .waitFor({ state: "visible", timeout: 5000 });
    console.log("[Boot] Game UI visible. Ready to start cognitive loop.\n");
  } catch {
    console.log(
      "[Boot] Action box not visible yet. Continuing — may need manual navigation."
    );
  }

  return { browser, page };
}

// ---------------------------------------------------------------------------
// Cognitive loop: one full turn
// ---------------------------------------------------------------------------

async function runTurn(
  page: import("playwright").Page,
  turnNumber: number
): Promise<void> {
  console.log(`\n${"═".repeat(60)}`);
  console.log(`  TURN ${turnNumber}`);
  console.log(`${"═".repeat(60)}\n`);

  // ── Phase 1: Perception ──────────────────────────────────────────────
  console.log("[Phase 1] Querying advisor + capturing game state...");

  // Start Spy capture BEFORE triggering the advisor query
  const bodyPromise = captureNextSimpleChatRequestBody(page);
  await enterAdvisorQuery(page, ADVISOR_QUERY);

  // Await the intercepted request body
  const requestBody = await bodyPromise;
  writeGameStateFromPayload(requestBody);

  // Poll for the advisor's response text
  const advisorText = await getLastAdvisorResponseText(page);
  writeAdvisorResponse(advisorText);
  if (advisorText) {
    console.log(
      `[Phase 1] Advisor says: ${firstFewSentences(advisorText)}\n`
    );
  }

  // ── Phase 2+3: Brain ────────────────────────────────────────────────
  console.log("[Phase 2+3] Running Brain (Gemini 2.5 Flash)...");
  const batch = await generateActions();

  console.log(`\n[Brain] Reasoning: ${batch.reasoning}`);
  console.log(`[Brain] Actions (${batch.actions.length}):`);
  for (let i = 0; i < batch.actions.length; i++) {
    console.log(`  ${i + 1}. ${batch.actions[i]}`);
  }

  // ── Phase 4: Execution ──────────────────────────────────────────────
  console.log(`\n[Phase 4] Submitting ${batch.actions.length} actions...`);
  for (let i = 0; i < batch.actions.length; i++) {
    await enterAction(page, batch.actions[i]);
    if (i < batch.actions.length - 1) {
      await sleep(ACTION_DELAY_MS);
    }
  }
  console.log("[Phase 4] All actions submitted.");
}

// ---------------------------------------------------------------------------
// Main loop
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log("=== Pax-Automata — Cognitive Loop ===\n");

  const { browser, page } = await boot();

  let turnNumber = 1;

  // Graceful shutdown on Ctrl+C
  let stopping = false;
  process.on("SIGINT", () => {
    if (stopping) process.exit(1);
    stopping = true;
    console.log("\nCtrl+C received — finishing current turn then shutting down...");
  });

  try {
    while (!stopping) {
      await runTurn(page, turnNumber);

      if (stopping) break;

      // Auto-advance to next turn
      console.log("\n[Turn Advance] Advancing 1 week...");
      await clickNextTurn(page);
      turnNumber++;
    }
  } catch (err) {
    console.error("Loop error:", err);
  } finally {
    await browser.close();
    console.log("Browser closed. Goodbye.");
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
