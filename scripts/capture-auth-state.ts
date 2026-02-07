/**
 * Capture auth state for Pax Historia (Google login).
 *
 * Opens a real browser window. You log in manually (including the Google popup).
 * When you're in the game, press Enter in the terminal to save cookies + localStorage
 * to auth/auth_state.json. Your main script should use storageState: 'auth/auth_state.json'.
 *
 * Run: npm run capture-auth  (or npx tsx scripts/capture-auth-state.ts)
 */

import { chromium } from "playwright";
import * as fs from "fs";
import * as readline from "readline";
import * as path from "path";

const AUTH_DIR = path.join(process.cwd(), "auth");
const GAME_URL = "https://www.paxhistoria.co";
const USER_DATA_DIR = path.join(AUTH_DIR, "profile");
const STATE_PATH = path.join(AUTH_DIR, "auth_state.json");

async function main() {
  console.log("-------------------------------------------");
  console.log("Pax Historia — Auth state capture");
  console.log("-------------------------------------------");
  console.log("1. A browser window will open.");
  console.log("2. Log in to the game (use 'Sign in with Google' if needed).");
  console.log("3. When you see the game and are fully logged in, come back here.");
  console.log("4. Press ENTER in this terminal to save auth state and exit.");
  console.log("-------------------------------------------\n");

  fs.mkdirSync(AUTH_DIR, { recursive: true });

  const context = await chromium.launchPersistentContext(USER_DATA_DIR, {
    headless: false,
    slowMo: 50,
    args: [
      "--disable-blink-features=AutomationControlled",
      "--start-maximized",
    ],
  });

  const page = context.pages()[0] ?? (await context.newPage());
  await page.goto(GAME_URL, { waitUntil: "domcontentloaded" });

  await new Promise<void>((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question("Press ENTER after you are logged in to save auth state... ", () => {
      rl.close();
      resolve();
    });
  });

  await context.storageState({ path: STATE_PATH });
  await context.close();

  console.log(`\nAuth state saved to: ${STATE_PATH}`);
  console.log("Use it in your runner: newContext({ storageState: 'auth/auth_state.json' })");
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
