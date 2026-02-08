/**
 * Navigation flows: presets, open a game (e.g. WW2).
 */

import type { Page } from "playwright";
import { SELECTORS } from "./selectors";

const STEP_DELAY_MS = 2500;

/**
 * From the logged-in homepage: Choose Preset → WW2 → Play Now → USA → Play as USA → Start Game → Start Playing!.
 * Waits 2.5s between each button press.
 */
export async function openPresetAndSelectWW2(page: Page): Promise<void> {
  console.log("[Navigate] Waiting for Choose Preset button...");
  const choosePreset = page.getByRole("button", { name: "Choose Preset" });
  await choosePreset.waitFor({ state: "visible", timeout: 20000 });
  await page.waitForTimeout(STEP_DELAY_MS);
  console.log("[Navigate] Clicking Choose Preset...");
  await choosePreset.click();
  await page.waitForURL(/\/presets/, { timeout: 15000 });
  await page.waitForTimeout(STEP_DELAY_MS);

  console.log("[Navigate] Clicking Open World War II...");
  await page.locator(SELECTORS.ww2PresetLink).click();
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(STEP_DELAY_MS);

  console.log("[Navigate] Clicking Play Now...");
  await page.getByRole("button", { name: "Play Now" }).click();
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(STEP_DELAY_MS);

  // Sometimes the game shows "Sign in with Google" even when already logged in (their glitch).
  // Click it so auth state re-applies; then we land back on the Play Now page and need to click it again.
  const signInWithGoogle = page.getByRole("button", { name: "Sign In With Google" });
  try {
    await signInWithGoogle.waitFor({ state: "visible", timeout: 5000 });
    console.log("[Navigate] Sign in with Google shown (game glitch); clicking to re-auth...");
    await signInWithGoogle.click();
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(STEP_DELAY_MS);

    // Re-auth returns to the Play Now page; click it again.
    const playNowAgain = page.getByRole("button", { name: "Play Now" });
    await playNowAgain.waitFor({ state: "visible", timeout: 8000 });
    console.log("[Navigate] Clicking Play Now again...");
    await playNowAgain.click();
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(STEP_DELAY_MS);
  } catch {
    // Sign in button not shown — already on nation picker or game; continue.
  }

  console.log("[Navigate] Clicking USA...");
  await page.getByRole("button", { name: /USA/ }).first().click();
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(STEP_DELAY_MS);

  console.log("[Navigate] Clicking Play as USA...");
  await page.getByRole("button", { name: "Play as USA" }).click();
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(STEP_DELAY_MS);

  console.log("[Navigate] Clicking Start Game...");
  await page.getByRole("button", { name: "Start Game" }).click();
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(STEP_DELAY_MS);

  console.log("[Navigate] Clicking Start Playing!...");
  await page.getByRole("button", { name: "Start Playing!" }).click();
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(STEP_DELAY_MS);

  console.log("[Navigate] WW2 game with USA loaded.");
}
