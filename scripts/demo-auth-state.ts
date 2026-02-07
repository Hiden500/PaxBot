/**
 * Demo: load saved auth state and open Pax Historia (no manual login).
 *
 * Uses auth/auth_state.json. If you're logged in, you should see the game
 * or your dashboard instead of a login page.
 *
 * Run: npx tsx scripts/demo-auth-state.ts
 */

import { chromium } from "playwright";
import * as path from "path";
import * as fs from "fs";

const AUTH_DIR = path.join(process.cwd(), "auth");
const STATE_PATH = path.join(AUTH_DIR, "auth_state.json");
const GAME_URL = "https://www.paxhistoria.co";

async function main() {
  if (!fs.existsSync(STATE_PATH)) {
    console.error("No auth state found. Run: npm run capture-auth");
    process.exit(1);
  }

  console.log("Loading saved auth state from auth/auth_state.json ...");
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    storageState: STATE_PATH,
  });

  const page = await context.newPage();
  console.log("Navigating to", GAME_URL, "...");
  await page.goto(GAME_URL, { waitUntil: "domcontentloaded", timeout: 15000 });

  await page.waitForTimeout(3000);

  const url = page.url();
  const title = await page.title();
  console.log("\n--- Result ---");
  console.log("URL:", url);
  console.log("Title:", title);
  console.log("If you see the game (not a login page), auth state is working.");
  console.log("Browser will close in 5 seconds ...");

  await page.waitForTimeout(5000);
  await browser.close();
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
