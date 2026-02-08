/**
 * Hand: type into action box and advisor box, then submit.
 * Used by the interactor (manual session) and will be used by the batch executor.
 */

import type { Page } from "playwright";
import { SELECTORS } from "./selectors";

/** Open the actions panel (⚡) if the action textarea is not visible. */
async function ensureActionsPanelOpen(page: Page): Promise<void> {
  const box = page.locator(SELECTORS.actionBox);
  try {
    await box.waitFor({ state: "visible", timeout: 3000 });
    return;
  } catch {
    await page.locator(SELECTORS.actionsPanelButton).click();
    await box.waitFor({ state: "visible", timeout: 10000 });
    await page.waitForTimeout(500);
  }
}

export async function enterAction(page: Page, text: string): Promise<void> {
  await ensureActionsPanelOpen(page);
  const box = page.locator(SELECTORS.actionBox);
  await box.fill(text);
  await page.locator(SELECTORS.actionSubmitButton).first().click();
  console.log("[Action] submitted:", text.slice(0, 50) + (text.length > 50 ? "..." : ""));
}

/** Open the advisor panel (flag icon in bottom-right) if the advisor textarea is not visible. */
async function ensureAdvisorPanelOpen(page: Page): Promise<void> {
  const box = page.locator(SELECTORS.advisorBox);
  try {
    await box.waitFor({ state: "visible", timeout: 3000 });
    return;
  } catch {
    await page.locator(SELECTORS.advisorPanelTrigger).click();
    await box.waitFor({ state: "visible", timeout: 10000 });
    await page.waitForTimeout(500);
  }
}

export async function enterAdvisorQuery(page: Page, text: string): Promise<void> {
  await ensureAdvisorPanelOpen(page);
  const box = page.locator(SELECTORS.advisorBox);
  await box.fill(text);
  await page.getByRole("button", { name: "Send message" }).click();
  console.log("[Advisor] submitted:", text.slice(0, 50) + (text.length > 50 ? "..." : ""));
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
        if (text) parts.push(text);
      }
      const full = parts.join("\n\n").trim();
      if (full.length > 80) {
        if (full !== lastText) {
          lastText = full;
          lastChangeTime = Date.now();
        }
        if (Date.now() - lastChangeTime >= ADVISOR_STABLE_MS) return lastText;
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

/**
 * Click the next-turn control (top right), then click the "1 week" button to advance.
 * Then repeatedly click "Next Event" until no more event popups (or timeout).
 * Call after actions/advisor are submitted.
 */
export async function clickNextTurn(page: Page): Promise<void> {
  await page.locator(SELECTORS.nextTurnButton).first().click();
  await page.waitForTimeout(1500);
  // Button shows date + "1 week" (e.g. "12/8/1935" and "1 week"); match by text.
  await page.getByRole("button", { name: /1 week/i }).click();
  console.log("[Hand] Clicked next turn (1 week).");
  await dismissNextEvents(page);
}

/** First "Next Event" can take a long time (site shows loading until LLM returns). */
const NEXT_EVENT_FIRST_TIMEOUT_MS = 120_000;
/** After the first event, each next one usually appears quickly; use shorter timeout to exit when done. */
const NEXT_EVENT_LATER_TIMEOUT_MS = 10_000;
/** Pause after each click so the next "Next Event" or "Proceed" can render. */
const NEXT_EVENT_PAUSE_AFTER_CLICK_MS = 3000;
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

  while (clicks < NEXT_EVENT_MAX_CLICKS && Date.now() - start < timeoutMs) {
    const btn = page.getByRole("button", { name: "Next Event" }).first();
    const waitMs = clicks === 0 ? NEXT_EVENT_FIRST_TIMEOUT_MS : NEXT_EVENT_LATER_TIMEOUT_MS;
    try {
      if (clicks === 0) console.log("[Hand] Waiting for first event (loading/LLM may take a while)…");
      await btn.waitFor({ state: "visible", timeout: waitMs });
    } catch {
      break;
    }
    await btn.click();
    clicks++;
    if (clicks % 10 === 0) console.log("[Hand] Dismissed", clicks, "events…");
    await page.waitForTimeout(NEXT_EVENT_PAUSE_AFTER_CLICK_MS);
  }

  if (clicks > 0) console.log("[Hand] Done dismissing events. Total:", clicks);

  // Final step: click "Proceed 12/8/1935" (or current date) to close the timeline and land on the new turn.
  const proceedBtn = page.getByRole("button", { name: /Proceed\s+\d/i }).first();
  try {
    await proceedBtn.waitFor({ state: "visible", timeout: 8000 });
    await proceedBtn.click();
    console.log("[Hand] Clicked Proceed (timeline closed).");
  } catch {
    // No Proceed button; timeline may already be closed
  }
}
