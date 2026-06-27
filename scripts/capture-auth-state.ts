/**
 * Capture auth state for Pax Historia (Google login).
 *
 * Opens a real browser window (or connects to an existing one via CDP).
 * You log in manually (including the Google popup).
 * When you're in the game, press Enter in the terminal to save cookies + localStorage
 * to auth/auth_state.json. Your main script should use storageState: 'auth/auth_state.json'.
 *
 * Run standard (try official Chrome):
 *   npm run capture-auth
 *
 * Run via CDP (100% bypass of Google Auth block):
 *   1. Close all Chrome instances.
 *   2. Run in PowerShell:
 *      start chrome --remote-debugging-port=9222 --user-data-dir="C:\Users\yurew\.gemini\antigravity\chrome-profile"
 *   3. Run:
 *      npm run capture-auth -- --cdp
 */

import { chromium, BrowserContext, Browser } from "playwright";
import * as fs from "fs";
import * as readline from "readline";
import * as path from "path";

const AUTH_DIR = path.join(process.cwd(), "auth");
const GAME_URL = "https://www.paxhistoria.co";
const USER_DATA_DIR = path.join(AUTH_DIR, "profile");
const STATE_PATH = path.join(AUTH_DIR, "auth_state.json");

async function main() {
  const useCdp = process.argv.includes("--cdp");

  console.log("-------------------------------------------");
  console.log("Pax Historia — Auth state capture");
  console.log("-------------------------------------------");
  if (useCdp) {
    console.log("CDP MODE: Connecting to Chrome running on port 9222...");
    console.log("Make sure you started Chrome with: --remote-debugging-port=9222");
  } else {
    console.log("STANDARD MODE: Opening Chrome instance...");
    console.log("If Google blocks you, close all Chrome instances, start Chrome with");
    console.log("--remote-debugging-port=9222, and run: npm run capture-auth -- --cdp");
  }
  console.log("1. Log in to the game (use 'Sign in with Google' if needed).");
  console.log("2. When you see the game and are fully logged in, come back here.");
  console.log("3. Press ENTER in this terminal to save auth state and exit.");
  console.log("-------------------------------------------\n");

  fs.mkdirSync(AUTH_DIR, { recursive: true });

  let context: BrowserContext;
  let browser: Browser | null = null;

  if (useCdp) {
    try {
      browser = await chromium.connectOverCDP("http://localhost:9222");
      const contexts = browser.contexts();
      if (contexts.length === 0) {
        throw new Error("No contexts found in the connected Chrome instance.");
      }
      context = contexts[0];
    } catch (err) {
      console.error("\nFailed to connect via CDP. Is Chrome running on port 9222?");
      console.error("Run this command to start Chrome first:");
      console.error(
        'start chrome --remote-debugging-port=9222 --user-data-dir="C:\\Users\\yurew\\.gemini\\antigravity\\chrome-profile"\n'
      );
      process.exit(1);
    }
  } else {
    // Standard mode with Chrome channel and custom User-Agent
    context = await chromium.launchPersistentContext(USER_DATA_DIR, {
      headless: false,
      channel: "chrome", // Use installed Chrome instead of Chromium
      viewport: null, // Allow window size to define viewport
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
      slowMo: 50,
      args: ["--disable-blink-features=AutomationControlled", "--start-maximized"],
    });
  }

  const page = context.pages()[0] ?? (await context.newPage());

  // Go to game if we aren't already there
  const currentUrl = page.url();
  if (!currentUrl.includes("paxhistoria.co")) {
    await page.goto(GAME_URL, { waitUntil: "domcontentloaded" });
  }

  await new Promise<void>((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question("Press ENTER after you are logged in to save auth state... ", () => {
      rl.close();
      resolve();
    });
  });

  await context.storageState({ path: STATE_PATH });

  if (useCdp && browser) {
    await browser.close();
  } else {
    await context.close();
  }

  console.log(`\nAuth state saved to: ${STATE_PATH}`);
  console.log("Use it in your runner: newContext({ storageState: 'auth/auth_state.json' })");
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
