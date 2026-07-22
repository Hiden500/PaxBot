import { chromium, type BrowserContext, type Page } from "playwright";
import * as fs from "fs";
import * as path from "path";
import { BROWSER_CONFIG, PATHS } from "./shared/config";
import { getSessionDir, tui, getCampaignUrl } from "./shared";
import { getPrimaryCampaign } from "./campaign";
import { SELECTORS } from "./hand";
import { t } from "./shared/i18n";

const AUTH_DIR = path.join(process.cwd(), PATHS.AUTH_DIR);
const PROFILE_DIR = path.join(AUTH_DIR, "profile");
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

export async function bootBrowser(): Promise<{ browser: BrowserContext; page: Page }> {
  resetWarRoom();

  const campaign = getPrimaryCampaign();
  if (campaign) {
    tui.setCampaign(campaign.name);
  }

  tui.setStatus(t("log.launching"));
  tui.log(t("log.launching"));
  tui.log(t("log.using_chrome_profile"));
  
  // Launch persistent context with Chrome channel for ultimate safety and Google Login compatibility
  const browser = await chromium.launchPersistentContext(PROFILE_DIR, {
    headless: false,
    channel: "chrome",
    viewport: { width: BROWSER_WIDTH, height: BROWSER_HEIGHT },
    args: [
      `--window-position=0,25`,
      `--window-size=${BROWSER_WIDTH},${BROWSER_HEIGHT}`,
      "--disable-blink-features=AutomationControlled",
    ],
  });
  
  const currentUrl = getCampaignUrl() || process.env.GAME_URL;
  const targetUrl = currentUrl || BASE_URL;

  const pages = browser.pages();
  // Find a tab that is already on Pax Historia
  let page = pages.find(p => p.url().includes("paxhistoria.co"));
  
  if (!page) {
    page = pages[0] || (await browser.newPage());
  }

  tui.setStatus(`${t("log.navigating_game")}...`);
  tui.log(`${t("log.navigating_game")}: ${targetUrl}...`);
  
  // Navigate the chosen page to our targetUrl
  await page.goto(targetUrl, {
    waitUntil: "domcontentloaded",
    timeout: 25000,
  });

  // Close all other pages to prevent tab duplication
  for (const p of pages) {
    if (p !== page) {
      await p.close().catch(() => {});
    }
  }

  tui.setStatus(t("log.waiting_game_ui"));
  tui.log(t("log.waiting_game_ui_log"));

  let isReady = false;
  while (!isReady) {
    try {
      const actionBoxVisible = await page.locator(SELECTORS.actionBox).isVisible();
      const triggerVisible = await page.locator(SELECTORS.advisorPanelTrigger).isVisible();
      const nextTurnVisible = await page.locator(SELECTORS.nextTurnButton).isVisible();

      if (actionBoxVisible || triggerVisible || nextTurnVisible) {
        isReady = true;
        break;
      }
    } catch {
      // Ignore playwright errors during loading/redirects
    }
    await page.waitForTimeout(1500);
  }

  tui.log(t("log.game_ui_detected"));

  await page.evaluate(
    ({ sx, sy }: { sx: number; sy: number }) => {
      /* eslint-disable no-undef */
      document.body.style.transformOrigin = "top left";
      document.body.style.transform = `scale(${sx}, ${sy})`;
      /* eslint-enable no-undef */
    },
    { sx: BROWSER_CONFIG.PAGE_ZOOM_X, sy: BROWSER_CONFIG.PAGE_ZOOM_Y }
  );

  tui.log(t("log.boot_ready"));

  return { browser, page };
}
