/**
 * PaxBot — full cognitive loop.
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
  SELECTORS,
} from "./hand";
import {
  captureNextSimpleChatRequestBody,
  writeAdvisorResponse,
  writeGameStateFromPayload,
} from "./spy";
import { generateActions } from "./brain";
import { validateEnv } from "./brain/llm-client";
import { BROWSER_CONFIG, PATHS } from "./shared/config";
import {
  getSessionDir,
  tui,
  TUIDashboard,
  getActiveCampaignName,
  setActiveCampaignName,
  getCampaignUrl,
  setCampaignUrl,
} from "./shared";
import { loadMemory, saveMemory, updateMemoryAfterTurn } from "./memory";
import { getPrimaryCampaign, initializeCampaignFromMarkdown } from "./campaign";
import { loadAllCampaigns } from "./campaign/loader";
import { select, input, confirm } from "@inquirer/prompts";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const AUTH_DIR = path.join(process.cwd(), PATHS.AUTH_DIR);
const STATE_PATH = path.join(AUTH_DIR, PATHS.AUTH_STATE);
const BASE_URL = "https://www.paxhistoria.co";

const BROWSER_WIDTH = Math.round((BROWSER_CONFIG.SCREEN_WIDTH * 7) / 10);
const BROWSER_HEIGHT = BROWSER_CONFIG.SCREEN_HEIGHT;

/** Default advisor question when no dynamic suggestion exists yet (e.g. turn 1). */
const DEFAULT_ADVISOR_QUERY =
  "What is our current position and what do you advise for our next actions?";
/** Advisor query for this turn: dynamic (from last Brain suggestion) or default. */
function getAdvisorQueryForTurn(): string {
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

// ---------------------------------------------------------------------------
// Startup banner (Claude-code style: mascot + multiline title)
// ---------------------------------------------------------------------------

const STARTUP_BANNER = `
PAXBOT
<< Always watching, always learning, always winning. >>
                            _______              
                           /  ___  \\    
                          |  /   \\  |
                          | | (o) | |
                          |  \\___/  |
                           \\_______/
Autonomous agent playing Pax Historia (grand strategy).
Ingests game state, plans, then executes autonomously.
100+ games won and counting...
`;

function printStartupBanner(): void {
  console.log(STARTUP_BANNER);
}

// ---------------------------------------------------------------------------
// Menu
// ---------------------------------------------------------------------------

async function createNewCampaignFlow(): Promise<void> {
  const filename = await input({
    message: "Enter new campaign filename (e.g. 'my-campaign'):",
    validate: (val) => {
      if (!val.trim()) {
        return "Filename cannot be empty.";
      }
      if (/[^a-zA-Z0-9_-]/.test(val)) {
        return "Use only alphanumeric characters, dashes, or underscores.";
      }
      return true;
    },
  });

  const mdName = `${filename}.md`;
  const mdPath = path.join(process.cwd(), PATHS.WAR_ROOM, PATHS.CAMPAIGNS_DIR, mdName);
  const templatePath = path.join(process.cwd(), PATHS.WAR_ROOM, PATHS.CAMPAIGNS_DIR, "TEMPLATE.md");

  if (fs.existsSync(mdPath)) {
    console.log(`\n⚠️ File ${mdName} already exists.`);
    return;
  }

  // Copy template
  if (fs.existsSync(templatePath)) {
    fs.copyFileSync(templatePath, mdPath);
  } else {
    fs.writeFileSync(mdPath, "# New Campaign\n\n## Country\n...\n", "utf-8");
  }

  console.log(`\n✨ Created template at: ${mdPath}`);
  console.log(
    "📝 Please open this file in your editor and describe the campaign parameters (country, goals, priorities, constraints)."
  );

  await input({
    message: "Press ENTER when you have finished editing the file to generate the JSON campaign...",
  });

  console.log("Generating campaign JSON using LLM...");
  try {
    const campaign = await initializeCampaignFromMarkdown(mdPath);
    console.log(`✅ Campaign "${campaign.name}" created and set as active.`);
  } catch (err) {
    console.error(`❌ Failed to create campaign: ${(err as Error).message}`);
  }
}

async function viewCampaignStatus(): Promise<void> {
  const activeCampaign = getActiveCampaignName();
  const currentUrl = getCampaignUrl() || process.env.GAME_URL || "None";
  const memory = loadMemory();

  console.log("\n==================================================");
  console.log(`📊 CAMPAIGN STATUS: ${activeCampaign}`);
  console.log(`🌐 GAME_URL: ${currentUrl}`);
  console.log("==================================================");

  // Strategic Summary
  console.log(`\n📜 Historical Context:`);
  console.log(`  ${memory.summary.historicalContext}`);

  // Achievements
  if (memory.summary.achievements.length > 0) {
    console.log(`\n🏆 Achievements (${memory.summary.achievements.length}):`);
    memory.summary.achievements.forEach((a) => {
      console.log(`  • [Turn ${a.turn}] ${a.description}`);
    });
  } else {
    console.log("\n🏆 Achievements: None yet");
  }

  // Failures
  if (memory.summary.failures.length > 0) {
    console.log(`\n❌ Failures (${memory.summary.failures.length}):`);
    memory.summary.failures.forEach((f) => {
      console.log(`  • [Turn ${f.turn}] ${f.description}`);
    });
  }

  // Lessons Learned
  if (memory.lessonsLearned.length > 0) {
    console.log(`\n💡 Lessons Learned (${memory.lessonsLearned.length}):`);
    memory.lessonsLearned.slice(-5).forEach((l) => {
      const typeIcon = l.type === "success" ? "✅" : "⚠️";
      console.log(`  ${typeIcon} [Turn ${l.turn}] ${l.lesson}`);
    });
  } else {
    console.log("\n💡 Lessons Learned: None yet");
  }

  // Active Operations from ledger
  const ledgerPath = path.join(getSessionDir(), PATHS.STRATEGIC_LEDGER);
  if (fs.existsSync(ledgerPath)) {
    try {
      const rawLedger = fs.readFileSync(ledgerPath, "utf-8");
      const ledger = JSON.parse(rawLedger);
      if (ledger.active_operations && ledger.active_operations.length > 0) {
        console.log(`\n⚔️ Active Operations (${ledger.active_operations.length}):`);
        ledger.active_operations.forEach((op: any) => {
          console.log(`  • [${op.operation_id}] ${op.goal}`);
        });
      } else {
        console.log("\n⚔️ Active Operations: None");
      }
    } catch {
      // ignore
    }
  }

  console.log("\n==================================================");
  await input({ message: "Press ENTER to return to menu..." });
}

async function resetCampaignSession(): Promise<void> {
  const activeCampaign = getActiveCampaignName();
  const confirmed = await confirm({
    message: `⚠️ Are you sure you want to reset all session progress for campaign "${activeCampaign}"? This will delete memory, active operations and logs.`,
    default: false,
  });

  if (confirmed) {
    const sessionDir = getSessionDir();
    if (fs.existsSync(sessionDir)) {
      const files = fs.readdirSync(sessionDir);
      for (const file of files) {
        const filePath = path.join(sessionDir, file);
        if (fs.statSync(filePath).isDirectory()) {
          fs.rmSync(filePath, { recursive: true, force: true });
        } else {
          fs.unlinkSync(filePath);
        }
      }
      console.log(`\n🧹 Session progress for campaign "${activeCampaign}" has been reset.`);
    }
  }
}

async function runInteractiveMenu(): Promise<void> {
  if (process.argv.includes("--continue")) {
    return;
  }

  let activeCampaign = getActiveCampaignName();
  let currentUrl = getCampaignUrl() || process.env.GAME_URL || "";

  let exit = false;
  while (!exit) {
    const action = await select({
      message: "PaxBot Main Menu",
      choices: [
        { name: `🚀 Continue (${activeCampaign})`, value: "continue" },
        { name: "📁 Select Campaign", value: "select_campaign" },
        { name: "✨ Create New Campaign", value: "create_campaign" },
        { name: `🌐 Change GAME_URL (current: ${currentUrl || "None"})`, value: "change_url" },
        { name: "📊 View Campaign Status", value: "view_status" },
        { name: "🧹 Reset Campaign Session", value: "reset_session" },
        { name: "❌ Exit", value: "exit" },
      ],
    });

    if (action === "continue") {
      if (!currentUrl) {
        console.log("⚠️ GAME_URL is not set. Please set it first.");
        continue;
      }
      exit = true;
    } else if (action === "select_campaign") {
      const campaigns = loadAllCampaigns();
      if (campaigns.length === 0) {
        console.log("No campaigns found.");
        continue;
      }
      const selected = await select({
        message: "Select a campaign:",
        choices: campaigns.map((c) => ({ name: c.name, value: c.name })),
      });
      setActiveCampaignName(selected);
      activeCampaign = selected;
      currentUrl = getCampaignUrl() || process.env.GAME_URL || "";
    } else if (action === "create_campaign") {
      await createNewCampaignFlow();
      activeCampaign = getActiveCampaignName();
      currentUrl = getCampaignUrl() || process.env.GAME_URL || "";
    } else if (action === "change_url") {
      const newUrl = await input({
        message: "Enter GAME_URL:",
        default: currentUrl,
      });
      if (newUrl.trim()) {
        setCampaignUrl(newUrl.trim());
        currentUrl = newUrl.trim();
      }
    } else if (action === "view_status") {
      await viewCampaignStatus();
    } else if (action === "reset_session") {
      await resetCampaignSession();
    } else if (action === "exit") {
      process.exit(0);
    }
  }
}

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
// Background popup watcher — polls every 3s and dismisses popups instantly
// ---------------------------------------------------------------------------

let popupWatcherTimer: ReturnType<typeof setInterval> | null = null;
let popupCheckRunning = false; // prevent overlapping checks

function startPopupWatcher(page: import("playwright").Page): void {
  console.log("[PopupWatcher] Started — polling every 3s for stale popups.");
  popupWatcherTimer = setInterval(async () => {
    if (popupCheckRunning) {
      return;
    } // skip if previous check still running
    popupCheckRunning = true;
    try {
      await dismissGamePopups(page);
    } catch {
      // Page might be navigating or closed — ignore
    } finally {
      popupCheckRunning = false;
    }
  }, BROWSER_CONFIG.POPUP_POLL_MS);
}

function stopPopupWatcher(): void {
  if (popupWatcherTimer) {
    clearInterval(popupWatcherTimer);
    popupWatcherTimer = null;
    console.log("[PopupWatcher] Stopped.");
  }
}

// ---------------------------------------------------------------------------
// Boot: launch browser, navigate to game
// ---------------------------------------------------------------------------

function resetWarRoom(): void {
  const sessionDir = getSessionDir();

  fs.writeFileSync(
    path.join(sessionDir, PATHS.STRATEGIC_LEDGER),
    JSON.stringify({ active_operations: [] }, null, 2) + "\n",
    "utf-8"
  );
  fs.writeFileSync(
    path.join(sessionDir, PATHS.CURRENT_STATE),
    JSON.stringify({ current_state: "" }, null, 2) + "\n",
    "utf-8"
  );
  fs.writeFileSync(path.join(sessionDir, PATHS.ADVISOR_RESPONSE), "", "utf-8");
  console.log(`[Boot] War Room session reset (ledger, state, advisor) in ${sessionDir}.`);
}

async function boot() {
  ensureAuthState();
  resetWarRoom();

  const campaign = getPrimaryCampaign();
  if (campaign) {
    tui.setCampaign(campaign.name);
  }

  tui.setStatus("Launching browser...");
  tui.log("Launching browser with auth state...");
  const browser = await chromium.launch({
    headless: false,
    args: [`--window-position=0,25`, `--window-size=${BROWSER_WIDTH},${BROWSER_HEIGHT}`],
  });
  const context = await browser.newContext({
    storageState: STATE_PATH,
    viewport: { width: BROWSER_WIDTH, height: BROWSER_HEIGHT },
  });
  const page = await context.newPage();

  const currentUrl = getCampaignUrl() || process.env.GAME_URL;
  if (currentUrl) {
    tui.setStatus("Navigating to game URL...");
    tui.log(`Navigating to game: ${currentUrl}...`);
    await page.goto(currentUrl, {
      waitUntil: "domcontentloaded",
      timeout: 25000,
    });
  } else {
    tui.setStatus("Navigating to Pax Historia...");
    tui.log(`Navigating to ${BASE_URL}...`);
    await page.goto(BASE_URL, { waitUntil: "load", timeout: 25000 });
  }

  // When TUI is active, we don't want a blocking stdin pause that blocks redraws,
  // but if we do, we should notify the user via status.
  tui.setStatus("Press ENTER in the terminal to start the game loop...");
  tui.log("Waiting for user confirmation to start loop (Press ENTER in terminal)");
  await new Promise<void>((resolve) => {
    process.stdin.once("data", () => resolve());
  });

  // Brief wait for game UI to finish rendering (navigation already waited 2.5s)
  await page.waitForTimeout(1000);

  // Scale the page down using CSS transform so it fits; separate X/Y for aspect control.
  await page.evaluate(
    ({ sx, sy }: { sx: number; sy: number }) => {
      /* eslint-disable no-undef */
      document.body.style.transformOrigin = "top left";
      document.body.style.transform = `scale(${sx}, ${sy})`;
      /* eslint-enable no-undef */
    },
    { sx: BROWSER_CONFIG.PAGE_ZOOM_X, sy: BROWSER_CONFIG.PAGE_ZOOM_Y }
  );

  try {
    await page.locator(SELECTORS.actionBox).waitFor({ state: "visible", timeout: 5000 });
    console.log("[Boot] Game UI visible. Ready to start cognitive loop.\n");
  } catch {
    console.log("[Boot] Action box not visible yet. Continuing — may need manual navigation.");
  }

  return { browser, page };
}

// ---------------------------------------------------------------------------
// Cognitive loop: one full turn
// ---------------------------------------------------------------------------

async function runTurn(page: import("playwright").Page, turnNumber: number): Promise<void> {
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

// ---------------------------------------------------------------------------
// Main loop
// ---------------------------------------------------------------------------

/** Save ledger and state to timestamped snapshots for recovery. */
function saveLedgerSnapshot(turnNumber: number): void {
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

async function main(): Promise<void> {
  printStartupBanner();

  // Validate environment before doing anything else
  validateEnv();

  // Run interactive menu first before clearing TUI
  await runInteractiveMenu();

  if (process.stdout.isTTY) {
    TUIDashboard.active = true;
    process.stdout.write("\x1b[2J\x1b[H"); // Clear screen
  }

  const { browser, page } = await boot();

  // Start background popup watcher — catches "Get more tokens", "Help Improve AI Models", etc.
  startPopupWatcher(page);

  let turnNumber = 1;

  // Graceful shutdown on Ctrl+C
  let stopping = false;
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
          `\n[Turn ${turnNumber}] ERROR — skipping to next week:`,
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
    stopPopupWatcher();
    saveLedgerSnapshot(turnNumber);
    await browser.close();
    tui.setStatus("Stopped");
    tui.log("Browser closed. Goodbye.");
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
