import type { Page } from "playwright";
import { dismissGamePopups } from "./actions";
import { BROWSER_CONFIG } from "../shared/config";

let popupWatcherTimer: ReturnType<typeof setInterval> | null = null;
let popupCheckRunning = false; // prevent overlapping checks

export function startPopupWatcher(page: Page): void {
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

export function stopPopupWatcher(): void {
  if (popupWatcherTimer) {
    clearInterval(popupWatcherTimer);
    popupWatcherTimer = null;
    console.log("[PopupWatcher] Stopped.");
  }
}
