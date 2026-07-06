/**
 * Extracted UI helpers for Hand module to keep actions.ts focused.
 */

import type { Locator, Page } from "playwright";
import { dismissGamePopups } from "./actions";

/** Try to open the actions panel by clicking the trigger button. */
export async function tryOpenActionPanel(
  page: Page,
  panelBtn: Locator,
  box: Locator
): Promise<boolean> {
  try {
    await panelBtn.click();
    await box.waitFor({ state: "visible", timeout: 2000 });
    console.log("[Hand] Action panel opened.");
    return true;
  } catch {
    return false;
  }
}

/** Clear out stale modal buttons that might be blocking the UI by pressing Escape and clicking common buttons. */
export async function dismissStaleButtons(page: Page): Promise<void> {
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);
  for (const name of ["Maybe later", "Next Event", "Proceed", "Close", "OK", "Continue"]) {
    try {
      const stale = page.getByRole("button", { name }).first();
      if (await stale.isVisible()) {
        await stale.click();
        console.log(`[Hand] Dismissed stale "${name}" button`);
        await page.waitForTimeout(300);
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
  await page.goto(currentUrl.toString(), { waitUntil: "domcontentloaded", timeout: 20000 });
  await page.waitForTimeout(3000);

  const startBtn = page.getByRole("button", { name: "Start Playing!" }).first();
  try {
    await startBtn.waitFor({ state: "visible", timeout: 8000 });
    await startBtn.click();
    console.log("[Hand] Clicked 'Start Playing!' after reload.");
    await page.waitForTimeout(3000);
  } catch {
    /* might already be on the game page */
  }

  await dismissGamePopups(page);
  await box.waitFor({ state: "visible", timeout: 10000 });
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
  const proceedBtn = page.getByRole("button", { name: /Proceed\s+\d/i }).first();
  try {
    await proceedBtn.waitFor({ state: "visible", timeout: 3000 });
    await proceedBtn.click();
    console.log("[Hand] Clicked Proceed (timeline closed).");
  } catch {
    // No Proceed button; timeline may already be closed
  }
}
