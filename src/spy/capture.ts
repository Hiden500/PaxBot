/**
 * Spy: capture the next request to /api/simple-chat (request payload).
 * Playwright can intercept any network request/response; we wait for the one
 * triggered when the user submits an advisor message.
 */

import type { Page } from "playwright";

const SIMPLE_CHAT_URL = "/api/simple-chat";

/**
 * Waits for the next request to /api/simple-chat and returns its request body (POST data).
 * Call this before triggering the advisor submit; then await after submit.
 */
export async function captureNextSimpleChatRequestBody(
  page: Page,
  timeoutMs: number = 20000
): Promise<string | null> {
  try {
    const request = await page.waitForRequest((req) => req.url().includes(SIMPLE_CHAT_URL), {
      timeout: timeoutMs,
    });
    return request.postData();
  } catch (err) {
    console.warn(
      `[Spy] Timeout waiting for simple-chat request (${timeoutMs}ms):`,
      (err as Error).message
    );
    return null;
  }
}
