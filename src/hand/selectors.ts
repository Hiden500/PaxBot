/**
 * UI selectors for Pax Historia game (action box, advisor box, etc.).
 *
 * Source: docs/PRD.md, docs/pax-historia-research.md.
 * If the game UI changes (e.g. placeholder text), get fresh selectors via DevTools
 * and update here. Submit mechanic (Enter vs button) may also need verification.
 */

export const SELECTORS = {
  // In-game UI (action/advisor)
  actionBox: 'textarea[placeholder="Enter your action..."]',
  advisorBox: 'textarea[placeholder="Ask your advisor..."]',
  /** Button to open the actions panel (⚡). */
  actionsPanelButton: 'button[aria-label="Actions"]',
  /** Submit button next to the action textarea (send icon). */
  actionSubmitButton: 'button:has(svg.feather-send-message)',

  /** Clickable div that opens the advisor tab (USA flag in bottom-right, 12×12). Not a <button>. */
  advisorPanelTrigger: 'div.pwa-safe-bottom div.cursor-pointer.h-12.w-12:has(img[alt="USA flag"])',

  /** Advisor response text lives inside this (markdown rendered). */
  advisorResponseContent: 'div.markdown-content',

  // Home / presets navigation (after login)
  choosePresetButton: 'a[href="/presets"]',
  ww2PresetLink: 'a[aria-label="Open World War II"]',
} as const;

export type Selectors = typeof SELECTORS;
