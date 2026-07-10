/**
 * Extracted UI helpers for Hand module to keep actions.ts focused.
 */

import type { Locator, Page } from "playwright";
import { dismissGamePopups } from "./actions";
import { BROWSER_CONFIG } from "../shared/config";

/** Try to open the actions panel by clicking the trigger button. */
export async function tryOpenActionPanel(
  page: Page,
  panelBtn: Locator,
  box: Locator
): Promise<boolean> {
  try {
    await panelBtn.click({ timeout: BROWSER_CONFIG.ACTION_PANEL_OPEN_TIMEOUT_MS });
    await box.waitFor({
      state: "visible",
      timeout: BROWSER_CONFIG.ACTION_PANEL_VISIBLE_TIMEOUT_MS,
    });
    console.log("[Hand] Action panel opened.");
    return true;
  } catch {
    return false;
  }
}

/** Clear out stale modal buttons that might be blocking the UI by pressing Escape and clicking common buttons. */
export async function dismissStaleButtons(page: Page): Promise<void> {
  await page.keyboard.press("Escape");
  await page.waitForTimeout(BROWSER_CONFIG.KEYBOARD_WAIT_MS);
  const staleButtons = [
    /Maybe later|Позже|Может позже/i,
    /Next Event|Следующее событие/i,
    /Proceed|Продолжить/i,
    /Close|Закрыть/i,
    /OK/i,
    /Continue|Продолжить/i,
  ];
  for (const rx of staleButtons) {
    try {
      const stale = page.getByRole("button", { name: rx }).first();
      if (await stale.isVisible()) {
        await stale.click();
        console.log(`[Hand] Dismissed stale "${rx.source}" button`);
        await page.waitForTimeout(BROWSER_CONFIG.KEYBOARD_WAIT_MS);
      }
    } catch {
      /* not present */
    }
  }
}

/** Last resort: reload the page to un-stick the action panel. */
export async function reloadGamePageToRecover(page: Page, box: Locator): Promise<void> {
  console.log("[Hand] Action panel stuck — reloading game page to recover...");
  const currentUrl = new URL(page.url());
  currentUrl.search = ""; // strip ?round=N etc.
  await page.goto(currentUrl.toString(), {
    waitUntil: "domcontentloaded",
    timeout: BROWSER_CONFIG.PAGE_RELOAD_GOTO_TIMEOUT_MS,
  });
  await page.waitForTimeout(BROWSER_CONFIG.PAGE_RELOAD_WAIT_MS);

  const startBtn = page.getByRole("button", { name: /Start Playing!|Начать игру!/i }).first();
  try {
    await startBtn.waitFor({
      state: "visible",
      timeout: BROWSER_CONFIG.START_PLAYING_WAIT_TIMEOUT_MS,
    });
    await startBtn.click();
    console.log("[Hand] Clicked 'Start Playing!' after reload.");
    await page.waitForTimeout(BROWSER_CONFIG.PAGE_RELOAD_WAIT_MS);
  } catch {
    /* might already be on the game page */
  }

  await dismissGamePopups(page);
  await box.waitFor({ state: "visible", timeout: BROWSER_CONFIG.ACTION_PANEL_RECOVER_TIMEOUT_MS });
  console.log("[Hand] Action panel recovered after page reload.");
}

/** Scroll the actions scroll container to the bottom so the user can see the submitted action */
export async function scrollActionPanelToBottom(page: Page): Promise<void> {
  await page
    .locator("div.min-h-0.flex-1.overflow-y-auto")
    .first()
    .evaluate((el) => el.scrollTo({ top: el.scrollHeight, behavior: "smooth" }))
    .catch(() => {});
}

/** Scroll the advisor chat container to the bottom */
export async function scrollAdvisorPanelToBottom(page: Page): Promise<void> {
  await page
    .locator("div.flex.grow.flex-col.gap-3")
    .first()
    .evaluate((el) => {
      const scrollParent = el.closest(".overflow-y-auto") ?? el.parentElement;
      if (scrollParent) {
        scrollParent.scrollTo({ top: scrollParent.scrollHeight, behavior: "smooth" });
      }
    })
    .catch(() => {});
}

/** Scroll the latest bold event headline into view so the user can read it */
export async function scrollLatestEventHeadlineIntoView(page: Page): Promise<void> {
  await page
    .locator("div.min-h-0.flex-1.overflow-y-auto")
    .first()
    .evaluate((container) => {
      const headlines = container.querySelectorAll(".font-bold.uppercase");
      const last = headlines[headlines.length - 1];
      if (last) {
        last.scrollIntoView({ behavior: "smooth", block: "start" });
      } else {
        container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
      }
    })
    .catch(() => {});
}

/** Close timeline by clicking Proceed */
export async function clickProceedButton(page: Page): Promise<void> {
  const proceedBtn = page.getByRole("button", { name: /(Proceed|Продолжить)\s+\d/i }).first();
  try {
    await proceedBtn.waitFor({ state: "visible", timeout: BROWSER_CONFIG.PROCEED_WAIT_TIMEOUT_MS });
    await proceedBtn.click();
    console.log("[Hand] Clicked Proceed (timeline closed).");
  } catch {
    // No Proceed button; timeline may already be closed
  }
}
