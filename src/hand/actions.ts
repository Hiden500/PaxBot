/**
 * Hand: type into action box and advisor box, then submit.
 * Used by the interactor (manual session) and will be used by the batch executor.
 */

import type { Locator, Page } from "playwright";
import { SELECTORS } from "./selectors";

/** Dismiss game popups ("Help Improve AI Models", "Get more tokens", etc.) if visible.
 *  Called before every major UI interaction as a safety net. */
export async function dismissGamePopups(page: Page): Promise<void> {
  // 1. "Help Improve AI Models" → click "Maybe later"
  try {
    const maybeLater = page.getByRole("button", { name: "Maybe later" }).first();
    if (await maybeLater.isVisible()) {
      await maybeLater.click();
      console.log("[Hand] Dismissed 'Help Improve AI Models' popup.");
      await page.waitForTimeout(500);
    }
  } catch {
    /* not present */
  }

  // 2. "Get more tokens" / any dialog with an aria-label="Close" X button.
  //    HTML: <section role="dialog"> ... <button aria-label="Close"> (the X)
  try {
    const closeBtn = page.locator('section[role="dialog"] button[aria-label="Close"]').first();
    if (await closeBtn.isVisible()) {
      console.log("[Hand] Dialog popup detected (Get more tokens, etc.) — clicking Close...");
      await closeBtn.click();
      console.log("[Hand] Dismissed dialog popup.");
      await page.waitForTimeout(500);
      return; // done
    }
  } catch {
    /* not present */
  }

  // 3. Fallback: any visible aria-label="Dismiss" button (hidden screen-reader dismiss buttons)
  try {
    const dismissBtn = page.locator('button[aria-label="Dismiss"]').first();
    if (await dismissBtn.isVisible()) {
      await dismissBtn.click();
      console.log("[Hand] Dismissed dialog via Dismiss button.");
      await page.waitForTimeout(500);
      return;
    }
  } catch {
    /* not present */
  }
}

/** Type text character-by-character with a fast typing effect. */
const TYPE_DELAY_MS = 15;
async function typeText(box: Locator, text: string): Promise<void> {
  await box.click();
  await box.pressSequentially(text, { delay: TYPE_DELAY_MS });
}

/** Open the actions panel (⚡) if the action textarea is not visible.
 *  Retries with Escape presses to dismiss any overlaying popups/modals. */
const ACTION_PANEL_RETRIES = 3;
async function ensureActionsPanelOpen(page: Page): Promise<void> {
  const box = page.locator(SELECTORS.actionBox);
  const panelBtn = page.locator(SELECTORS.actionsPanelButton);

  for (let attempt = 0; attempt < ACTION_PANEL_RETRIES; attempt++) {
    // Quick check: already visible?
    if (await box.isVisible()) {
      return;
    }

    console.log(
      `[Hand] Action panel not visible (attempt ${attempt + 1}/${ACTION_PANEL_RETRIES}), opening...`
    );

    // Clear popups that may be covering the panel
    await dismissGamePopups(page);

    // Re-check immediately — popup may have been the only blocker
    if (await box.isVisible()) {
      console.log("[Hand] Action panel visible after popup dismissal.");
      return;
    }

    // Try clicking the panel button to open it
    try {
      await panelBtn.click();
      await box.waitFor({ state: "visible", timeout: 2000 });
      console.log("[Hand] Action panel opened.");
      return;
    } catch {
      /* didn't work */
    }

    // Heavier recovery: Escape + stale buttons
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

  // Last resort: reload the game page without query params and click "Start Playing!"
  console.log("[Hand] Action panel stuck — reloading game page to recover...");
  try {
    const currentUrl = new URL(page.url());
    currentUrl.search = ""; // strip ?round=N etc.
    await page.goto(currentUrl.toString(), { waitUntil: "domcontentloaded", timeout: 20000 });
    await page.waitForTimeout(3000);

    // Click "Start Playing!" if it appears (re-entering an in-progress game)
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
    return;
  } catch {
    throw new Error("Could not open actions panel — reload recovery also failed");
  }
}

export async function enterAction(page: Page, text: string): Promise<void> {
  await ensureActionsPanelOpen(page);
  const box = page.locator(SELECTORS.actionBox);
  await typeText(box, text);
  await page.locator(SELECTORS.actionSubmitButton).first().click();
  console.log("[Action] submitted:", text.slice(0, 50) + (text.length > 50 ? "..." : ""));
  // Scroll the actions scroll container to the bottom so the user can see the submitted action
  await page
    .locator("div.min-h-0.flex-1.overflow-y-auto")
    .first()
    .evaluate((el) => el.scrollTo({ top: el.scrollHeight, behavior: "smooth" }))
    .catch(() => {});
}

/** Open the advisor panel (flag icon in bottom-right) if the advisor textarea is not visible. */
async function ensureAdvisorPanelOpen(page: Page): Promise<void> {
  const box = page.locator(SELECTORS.advisorBox);
  try {
    await box.waitFor({ state: "visible", timeout: 3000 });
    return;
  } catch {
    // Maybe a popup is covering — dismiss and try again
    await dismissGamePopups(page);
    try {
      await box.waitFor({ state: "visible", timeout: 2000 });
      return;
    } catch {
      /* still not visible, click the trigger */
    }

    await page.locator(SELECTORS.advisorPanelTrigger).click();
    await box.waitFor({ state: "visible", timeout: 10000 });
    await page.waitForTimeout(500);
  }
}

export async function enterAdvisorQuery(page: Page, text: string): Promise<void> {
  await ensureAdvisorPanelOpen(page);
  const box = page.locator(SELECTORS.advisorBox);
  await typeText(box, text);
  await page.getByRole("button", { name: "Send message" }).click();
  console.log("[Advisor] submitted:", text.slice(0, 50) + (text.length > 50 ? "..." : ""));
  // Scroll the advisor chat container to the bottom
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

/** Poll interval and how long we wait for the advisor response to stop changing (streaming). */
const ADVISOR_POLL_MS = 2000;
const ADVISOR_STABLE_MS = 5000;

/** Wait for the latest advisor response to have content, then return its full text. */
export async function getLastAdvisorResponseText(
  page: Page,
  timeoutMs: number = 60000
): Promise<string> {
  const start = Date.now();
  let lastText = "";
  let lastChangeTime = 0;

  while (Date.now() - start < timeoutMs) {
    const locator = page.locator(SELECTORS.advisorResponseContent);
    try {
      await locator.first().waitFor({ state: "visible", timeout: 2000 });
      const count = await locator.count();
      const parts: string[] = [];
      for (let i = 0; i < count; i++) {
        const text = (await locator.nth(i).innerText()).trim();
        if (text) {
          parts.push(text);
        }
      }
      const full = parts.join("\n\n").trim();
      if (full.length > 80) {
        if (full !== lastText) {
          lastText = full;
          lastChangeTime = Date.now();
        }
        if (Date.now() - lastChangeTime >= ADVISOR_STABLE_MS) {
          return lastText;
        }
      }
    } catch {
      // no element or empty yet
    }
    await page.waitForTimeout(ADVISOR_POLL_MS);
  }
  return lastText || "";
}

/** Return the first few sentences of a block of text (for terminal preview). */
export function firstFewSentences(text: string, maxSentences: number = 3): string {
  const sentences = text.split(/(?<=[.!?])\s+/).filter((s) => s.trim().length > 0);
  return sentences.slice(0, maxSentences).join(" ").trim() || text.slice(0, 300);
}

/** Close action/advisor panel overlays by clicking their X close buttons.
 *  These are plain buttons with an SVG X icon (feather "x": two crossing lines)
 *  and no aria-label. Needed on compressed viewports where panels cover the
 *  next-turn button. */
async function closePanelOverlays(page: Page): Promise<void> {
  // Selector: button containing the feather X icon (two specific <line> elements)
  const xButtons = page.locator('button:has(svg line[x1="18"][y1="6"][x2="6"][y2="18"])');
  const count = await xButtons.count();
  for (let i = 0; i < count; i++) {
    try {
      const btn = xButtons.nth(i);
      if (await btn.isVisible()) {
        await btn.click();
        console.log(`[Hand] Closed panel overlay (X button ${i + 1}/${count}).`);
        await page.waitForTimeout(300);
      }
    } catch {
      /* button disappeared or not interactive */
    }
  }
}

/**
 * Click the next-turn control (top right), then click the "3 months" button to advance.
 * Then repeatedly click "Next Event" until no more event popups (or timeout).
 * Call after actions/advisor are submitted.
 */
export async function clickNextTurn(page: Page): Promise<void> {
  // Dismiss popups before attempting next turn
  await dismissGamePopups(page);
  // Close action/advisor panels that may cover the next-turn button on small viewports
  await closePanelOverlays(page);
  await page.locator(SELECTORS.nextTurnButton).first().click();
  await page.waitForTimeout(1500);
  // Button shows date + "3 months" (e.g. "12/8/1935" and "3 months"); match by text.
  await page.getByRole("button", { name: /3 months/i }).click();
  console.log("[Hand] Clicked next turn (3 months).");
  await dismissNextEvents(page);

  // Reopen the advisor panel after news so it's ready for the next turn cycle
  // (trigger is a toggle — only click if the panel is NOT already open)
  try {
    const advisorBox = page.locator(SELECTORS.advisorBox);
    if (!(await advisorBox.isVisible())) {
      await page.locator(SELECTORS.advisorPanelTrigger).click();
      await advisorBox.waitFor({ state: "visible", timeout: 3000 });
      console.log("[Hand] Reopened advisor panel after news.");
    }
  } catch {
    console.log("[Hand] Could not reopen advisor panel — will retry when needed.");
  }
}

/** First "Next Event" can take a long time (site shows loading until LLM returns). */
const NEXT_EVENT_FIRST_TIMEOUT_MS = 120_000;
/** After the first event, each next one usually appears quickly; use shorter timeout to exit when done. */
const NEXT_EVENT_LATER_TIMEOUT_MS = 10_000;
/** Pause after each click so the next "Next Event" or "Proceed" can render. */
const NEXT_EVENT_PAUSE_AFTER_CLICK_MS = 500;
const NEXT_EVENT_MAX_CLICKS = 80;

/**
 * Keep clicking the "Next Event" button until it disappears (no more events) or we hit max clicks.
 * Then click the final "Proceed <date>" button if present (e.g. "Proceed 12/8/1935").
 * Uses a long timeout for the first button (wait for loading/LLM); shorter timeout after that.
 */
export async function dismissNextEvents(page: Page): Promise<void> {
  let clicks = 0;
  const start = Date.now();
  const timeoutMs = 180_000;

  const nextEventBtn = page.getByRole("button", { name: "Next Event" }).first();
  const proceedBtn = page.getByRole("button", { name: /Proceed\s+\d/i }).first();

  while (clicks < NEXT_EVENT_MAX_CLICKS && Date.now() - start < timeoutMs) {
    const waitMs = clicks === 0 ? NEXT_EVENT_FIRST_TIMEOUT_MS : NEXT_EVENT_LATER_TIMEOUT_MS;
    if (clicks === 0) {
      console.log("[Hand] Waiting for first event (loading/LLM may take a while)…");
    }

    // Always check "Next Event" first — it takes priority over "Proceed".
    // Only break when Next Event is genuinely gone.
    try {
      await nextEventBtn.waitFor({ state: "visible", timeout: waitMs });
    } catch {
      // "Next Event" didn't appear in time — done with events
      break;
    }

    // "Next Event" is visible — click it
    await nextEventBtn.click();
    clicks++;
    if (clicks % 10 === 0) {
      console.log("[Hand] Dismissed", clicks, "events…");
    }
    // Wait for the new event content to render before scrolling
    await page.waitForTimeout(2000);
    // Scroll the latest bold event headline into view so the user can read it
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
    await page.waitForTimeout(NEXT_EVENT_PAUSE_AFTER_CLICK_MS);
  }

  if (clicks > 0) {
    console.log("[Hand] Done dismissing events. Total:", clicks);
  }

  // Click Proceed to close the timeline
  try {
    await proceedBtn.waitFor({ state: "visible", timeout: 3000 });
    await proceedBtn.click();
    console.log("[Hand] Clicked Proceed (timeline closed).");
  } catch {
    // No Proceed button; timeline may already be closed
  }

  // Zoom out the map: move cursor to center of viewport and scroll out
  await zoomOutMap(page);
}

/** Move cursor to the center of the viewport and scroll to zoom the map all the way out. */
async function zoomOutMap(page: Page): Promise<void> {
  const vp = page.viewportSize();
  if (!vp) {
    return;
  }
  await page.mouse.move(vp.width / 2, vp.height / 2);
  await page.waitForTimeout(500);
  for (let i = 0; i < 12; i++) {
    await page.mouse.wheel(0, 300);
    await page.waitForTimeout(80);
  }
  console.log("[Hand] Zoomed map out.");
}
