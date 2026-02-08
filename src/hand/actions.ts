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

/** Wait for the latest advisor response to have content, then return its full text. */
export async function getLastAdvisorResponseText(
  page: Page,
  timeoutMs: number = 30000
): Promise<string> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const last = page.locator(SELECTORS.advisorResponseContent).last();
    try {
      await last.waitFor({ state: "visible", timeout: 2000 });
      const text = (await last.innerText()).trim();
      if (text.length > 80) return text;
    } catch {
      // no element or empty yet
    }
    await page.waitForTimeout(2000);
  }
  return "";
}

/** Return the first few sentences of a block of text (for terminal preview). */
export function firstFewSentences(text: string, maxSentences: number = 3): string {
  const sentences = text.split(/(?<=[.!?])\s+/).filter((s) => s.trim().length > 0);
  return sentences.slice(0, maxSentences).join(" ").trim() || text.slice(0, 300);
}
