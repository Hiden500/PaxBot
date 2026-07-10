/**
 * Navigation flows: presets, open a game (e.g. WW2).
 */

import type { Page } from "playwright";
import { SELECTORS } from "./selectors";
import { dismissGamePopups } from "./actions";
import { BROWSER_CONFIG } from "../shared/config";

/** Click a button by name/regex, wait for DOM, then pause.
 *  On failure: dismiss popups and retry once. */
async function clickButton(page: Page, name: string | RegExp, label: string): Promise<void> {
  const btn = page.getByRole("button", { name }).first();
  try {
    await btn.waitFor({ state: "visible", timeout: BROWSER_CONFIG.BUTTON_TIMEOUT_MS });
  } catch {
    // Button not visible — maybe a popup is covering it. Dismiss and retry.
    console.log(`[Navigate] "${label}" not visible, dismissing popups and retrying...`);
    await dismissGamePopups(page);
    await btn.waitFor({ state: "visible", timeout: BROWSER_CONFIG.BUTTON_TIMEOUT_MS });
  }
  console.log(`[Navigate] Clicking ${label}...`);
  await btn.click();
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(BROWSER_CONFIG.STEP_DELAY_MS);
}

/**
 * From the logged-in homepage: Choose Preset → WW2 → Play Now → USA → Play as USA → Start Game → Start Playing!.
 * Waits 2.5s between each button press.
 */
export async function openPresetAndSelectWW2(page: Page): Promise<void> {
  console.log("[Navigate] Waiting for Choose Preset button...");
  const choosePreset = page.getByRole("button", { name: /Choose Preset|Выбрать пресет/i });
  await choosePreset.waitFor({
    state: "visible",
    timeout: BROWSER_CONFIG.PRESET_VISIBLE_TIMEOUT_MS,
  });
  await page.waitForTimeout(BROWSER_CONFIG.STEP_DELAY_MS);
  console.log("[Navigate] Clicking Choose Preset...");
  await choosePreset.click();
  await page.waitForURL(/\/presets/, { timeout: BROWSER_CONFIG.URL_WAIT_TIMEOUT_MS });
  await page.waitForTimeout(BROWSER_CONFIG.STEP_DELAY_MS);

  console.log("[Navigate] Clicking Open World War II...");
  await page.locator(SELECTORS.ww2PresetLink).click();
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(BROWSER_CONFIG.STEP_DELAY_MS);

  console.log("[Navigate] Clicking Play Now...");
  await page.getByRole("button", { name: /Play Now|Играть сейчас|Играть/i }).click();
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(BROWSER_CONFIG.STEP_DELAY_MS);

  // Sometimes the game shows "Sign in with Google" even when already logged in (their glitch).
  // Click it so auth state re-applies; then redo the Play Now → nation select flow.
  const signInWithGoogle = page.getByRole("button", {
    name: /Sign In With Google|Войти с помощью Google/i,
  });
  let needsReAuth = false;
  try {
    await signInWithGoogle.waitFor({
      state: "visible",
      timeout: BROWSER_CONFIG.REAUTH_VISIBLE_TIMEOUT_MS,
    });
    needsReAuth = true;
  } catch {
    /* not shown — continue normally */
  }

  if (needsReAuth) {
    console.log("[Navigate] Sign in with Google shown (game glitch); clicking to re-auth...");
    await signInWithGoogle.click();
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(BROWSER_CONFIG.STEP_DELAY_MS);

    // Re-auth lands back on the preset/Play Now page — redo Play Now.
    await clickButton(page, /Play Now|Играть сейчас|Играть/i, "Play Now (post re-auth)");
  }

  // USA → Play as USA → Start Game → Start Playing!
  await clickButton(page, /USA/, "USA");
  await clickButton(page, /Play as USA|Играть за США/i, "Play as USA");
  await clickButton(page, /Start Game|Начать игру|Запустить игру/i, "Start Game");
  await clickButton(page, /Start Playing!|Начать играть!/i, "Start Playing!");

  console.log("[Navigate] WW2 game with USA loaded.");
}
