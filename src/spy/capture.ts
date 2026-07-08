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
    // Decode from buffer to avoid UTF-8 mangling (Mojibake)
    const buffer = request.postDataBuffer();
    return buffer ? buffer.toString("utf-8") : null;
  } catch (err) {
    console.warn(
      `[Spy] Timeout waiting for simple-chat request (${timeoutMs}ms):`,
      (err as Error).message
    );
    return null;
  }
}

/**
 * Waits for the next response from /api/simple-chat and returns its JSON response body.
 * Captures game events and response payload for debugging.
 */
export async function captureNextSimpleChatResponse(
  page: Page,
  timeoutMs: number = 30000
): Promise<string | null> {
  try {
    const response = await page.waitForResponse((res) => res.url().includes(SIMPLE_CHAT_URL), {
      timeout: timeoutMs,
    });
    // Use raw body buffer and manually decode to UTF-8 to prevent encoding issues ("krakozyabry")
    const buffer = await response.body();
    return buffer.toString("utf-8");
  } catch (err) {
    console.warn(
      `[Spy] Timeout waiting for simple-chat response (${timeoutMs}ms):`,
      (err as Error).message
    );
    return null;
  }
}
