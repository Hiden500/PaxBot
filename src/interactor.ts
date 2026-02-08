/**
 * Interactor: run a single game session (login via auth state, navigate, test text entry).
 *
 * This is the entry point for manual testing. It uses the Hand module for UI actions.
 * When the full cognitive loop runs, index.ts will use the same Hand exports.
 *
 * Run: npm run interactor
 *
 * Optional: TEST_ENTRY=1 — After loading the game, automatically submits one action
 * and one advisor query so you can verify the flow without typing. Handy for quick
 * regression checks and development.
 */

import { chromium } from "playwright";
import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";
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

const AUTH_DIR = path.join(process.cwd(), "auth");
const STATE_PATH = path.join(AUTH_DIR, "auth_state.json");

const BASE_URL = "https://www.paxhistoria.co";
const GAME_PAGE_URL = process.env.GAME_URL ?? "";
const STEP_DELAY_MS = 2500;

async function ensureAuthState(): Promise<void> {
  if (!fs.existsSync(STATE_PATH)) {
    console.error("No auth state. Run: npm run capture-auth");
    process.exit(1);
  }
}

async function main(): Promise<void> {
  await ensureAuthState();

  console.log("Loading auth state and launching browser...");
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({ storageState: STATE_PATH });
  const page = await context.newPage();

  console.log("Navigating to", BASE_URL, "...");
  await page.goto(BASE_URL, { waitUntil: "load", timeout: 25000 });

  if (GAME_PAGE_URL) {
    console.log("Navigating to game page:", GAME_PAGE_URL, "...");
    await page.goto(GAME_PAGE_URL, { waitUntil: "domcontentloaded", timeout: 20000 });
  } else {
    await openPresetAndSelectWW2(page);
  }

  // Give the game view a moment to render after "Start Playing!" before we check for the action box.
  await page.waitForTimeout(3000);

  try {
    await page.locator(SELECTORS.actionBox).waitFor({ state: "visible", timeout: 10000 });
    console.log("Game UI visible. You can test action/advisor from code or keep using the browser.");
  } catch {
    console.log("Action box not visible yet (maybe on homepage). Navigate to a game to use action/advisor.");
  }

  const runTestEntry = process.env.TEST_ENTRY === "1";
  if (runTestEntry) {
    await page.waitForTimeout(STEP_DELAY_MS);
    try {
      await enterAction(page, "build up industry in arizona");
      await page.waitForTimeout(STEP_DELAY_MS);

      // Advisor: ask standard question (current position + advice for next actions). Spy captures state and stores response.
      const ADVISOR_QUERY =
        "What is our current position and what do you advise for our next actions?";
      const bodyPromise = captureNextSimpleChatRequestBody(page);
      await enterAdvisorQuery(page, ADVISOR_QUERY);
      const requestBody = await bodyPromise;
      writeGameStateFromPayload(requestBody);

      const advisorText = await getLastAdvisorResponseText(page);
      writeAdvisorResponse(advisorText);
      if (advisorText) {
        console.log("\n[Advisor] First few sentences:", firstFewSentences(advisorText));
      }

      console.log("\n--- Type 'ready' and press Enter to advance to next turn, or just Enter to close. ---");
      const answer = await new Promise<string>((resolve) => {
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        rl.question("> ", (input) => {
          rl.close();
          resolve((input ?? "").trim().toLowerCase());
        });
      });
      if (answer === "ready") {
        await clickNextTurn(page);
      }
    } catch (e) {
      console.warn("Test entry failed (not on a game page?):", e);
    }
  }

  console.log("\n--- Press Enter to close the browser and exit. ---");
  await new Promise<void>((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question("> ", () => {
      rl.close();
      resolve();
    });
  });

  await browser.close();
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
