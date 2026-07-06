/**
 * PaxBot — full cognitive loop.
 *
 * Boot → navigate → loop: Advisor query → Spy capture → Brain reasoning → Hand execution → next turn.
 *
 * Run: npm start
 * Optional: GAME_URL=<url> npm start — skip preset flow, go directly to an in-progress game.
 */

import { validateEnv } from "./brain/llm-client";
import { tui, TUIDashboard } from "./shared";
import { runInteractiveMenu } from "./campaign";
import { bootBrowser, printStartupBanner } from "./boot";
import { runCognitiveLoop } from "./loop";
import { startPopupWatcher, stopPopupWatcher } from "./hand";
import { startWebServer, stopWebServer } from "./web/server";
import { t } from "./shared/i18n";

async function main(): Promise<void> {
  printStartupBanner();

  // Validate environment before doing anything else
  validateEnv();

  // Start the Local Web UI server
  await startWebServer();

  // Run interactive menu first before clearing TUI
  await runInteractiveMenu();

  if (process.stdout.isTTY) {
    TUIDashboard.active = true;
    process.stdout.write("\x1b[2J\x1b[H"); // Clear screen
  }

  const { browser, page } = await bootBrowser();

  // Start background popup watcher — catches "Get more tokens", "Help Improve AI Models", etc.
  startPopupWatcher(page);

  try {
    await runCognitiveLoop(page);
  } finally {
    stopPopupWatcher();
    stopWebServer();
    await browser.close();
    tui.setStatus(t("menu.exit"));
    tui.log("Browser closed. Goodbye.");
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
