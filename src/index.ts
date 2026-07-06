/**
 * PaxBot — full cognitive loop.
 *
 * Boot → navigate → loop: Advisor query → Spy capture → Brain reasoning → Hand execution → next turn.
 *
 * Run: npm start
 * Optional: GAME_URL=<url> npm start — skip preset flow, go directly to an in-progress game.
 */

import { validateEnv } from "./brain/providers/registry";
import { startWebServer } from "./web/server";

async function main(): Promise<void> {
  console.log("PaxBot Web UI Server is starting...");

  // Validate environment before doing anything else
  validateEnv();

  // Start the Local Web UI server
  await startWebServer();

  console.log("[Web] Server initialized. Please manage the bot execution from the Web dashboard.");
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});