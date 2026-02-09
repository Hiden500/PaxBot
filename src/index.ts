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
  dismissGamePopups,
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

// Screen layout: browser takes left 5/6 of a 1512x982 MacBook display.
// CSS zoom scales the page down so the full-width game fits without clipping.
const SCREEN_WIDTH = 1512;
const BROWSER_WIDTH = Math.round(SCREEN_WIDTH * 5 / 6); // 1260
const BROWSER_HEIGHT = 960;
const PAGE_ZOOM = 0.5; // game renders at full size but displays 80% — fits in smaller window

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
  const browser = await chromium.launch({
    headless: false,
    args: [
      `--window-position=0,25`,
      `--window-size=${BROWSER_WIDTH},${BROWSER_HEIGHT}`,
    ],
  });
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

  // Scale the page down using CSS transform (not zoom) so both horizontal AND vertical
  // shrink equally without the page re-flowing its layout to fill extra space.
  await page.evaluate((z) => {
    document.body.style.transformOrigin = "top left";
    document.body.style.transform = `scale(${z})`;
  }, PAGE_ZOOM);

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

  // Dismiss any stale popups (e.g. "Help Improve AI Models") before starting
  await dismissGamePopups(page);

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
  let submitted = 0;
  for (let i = 0; i < batch.actions.length; i++) {
    try {
      await enterAction(page, batch.actions[i]);
      submitted++;
    } catch (err) {
      console.log(`[Phase 4] SKIPPED action ${i + 1} (panel blocked): ${(err as Error).message?.slice(0, 80)}`);
    }
    if (i < batch.actions.length - 1) {
      await sleep(ACTION_DELAY_MS);
    }
  }
  console.log(`[Phase 4] Done — ${submitted}/${batch.actions.length} actions submitted.`);
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
      try {
        await runTurn(page, turnNumber);
      } catch (err) {
        console.error(`\n[Turn ${turnNumber}] ERROR — skipping to next week:`, (err as Error).message?.slice(0, 120));
      }

      if (stopping) break;

      // Auto-advance to next turn
      console.log("\n[Turn Advance] Advancing 1 week...");
      await clickNextTurn(page);
      turnNumber++;
    }
  } catch (err) {
    console.error("Fatal loop error:", err);
  } finally {
    await browser.close();
    console.log("Browser closed. Goodbye.");
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
