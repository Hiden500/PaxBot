import { chromium, type Browser, type Page } from "playwright";
import * as fs from "fs";
import * as path from "path";
import { BROWSER_CONFIG, PATHS } from "./shared/config";
import { getSessionDir, tui, getCampaignUrl } from "./shared";
import { getPrimaryCampaign } from "./campaign";
import { SELECTORS } from "./hand";
import { t } from "./shared/i18n";

const AUTH_DIR = path.join(process.cwd(), PATHS.AUTH_DIR);
const STATE_PATH = path.join(AUTH_DIR, PATHS.AUTH_STATE);
const BASE_URL = "https://www.paxhistoria.co";

const BROWSER_WIDTH = Math.round((BROWSER_CONFIG.SCREEN_WIDTH * 7) / 10);
const BROWSER_HEIGHT = BROWSER_CONFIG.SCREEN_HEIGHT;

export const STARTUP_BANNER = `
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

export function printStartupBanner(): void {
  console.log(STARTUP_BANNER);
}

function ensureAuthState(): void {
  if (!fs.existsSync(STATE_PATH)) {
    console.error("No auth state. Run: npm run capture-auth");
    process.exit(1);
  }
}

export function resetWarRoom(): void {
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

export async function bootBrowser(): Promise<{ browser: Browser; page: Page }> {
  ensureAuthState();
  resetWarRoom();

  const campaign = getPrimaryCampaign();
  if (campaign) {
    tui.setCampaign(campaign.name);
  }

  tui.setStatus(t("log.launching"));
  tui.log(t("log.launching"));
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
    tui.setStatus(`${t("log.navigating_game")}...`);
    tui.log(`${t("log.navigating_game")}: ${currentUrl}...`);
    await page.goto(currentUrl, {
      waitUntil: "domcontentloaded",
      timeout: 25000,
    });
  } else {
    tui.setStatus(t("log.navigating_base"));
    tui.log(`${t("log.navigating_base")} ${BASE_URL}...`);
    await page.goto(BASE_URL, { waitUntil: "load", timeout: 25000 });
  }

  tui.setStatus(t("log.waiting_enter"));
  tui.log(t("log.waiting_enter"));
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(false);
  }
  process.stdin.resume();
  await new Promise<void>((resolve) => {
    process.stdin.once("data", () => {
      process.stdin.pause();
      resolve();
    });
  });

  await page.waitForTimeout(1000);

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
    tui.log(t("log.boot_ready"));
  } catch {
    tui.log(t("log.boot_stuck"));
  }

  return { browser, page };
}
