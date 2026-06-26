/**
 * Central configuration for PaxBot.
 * All constants and configuration values should be defined here.
 */

// ---------------------------------------------------------------------------
// LLM Configuration
// ---------------------------------------------------------------------------

export const LLM_CONFIG = {
  MODEL: "gemini-flash-latest",
  MAX_OUTPUT_TOKENS: 65536,
  RETRY_MAX_ATTEMPTS: 3,
  RETRY_BASE_DELAY_MS: 1000,
} as const;

// ---------------------------------------------------------------------------
// LLM Provider Configuration
// ---------------------------------------------------------------------------

/**
 * Default LLM provider to use.
 * Override with LLM_PROVIDER environment variable.
 * Supported: "gemini" | "groq" | "openai"
 */
export const DEFAULT_LLM_PROVIDER = "gemini" as const;

/**
 * Per-provider model overrides.
 * Key = provider name, Value = model name.
 * If not specified here, the provider's default model will be used.
 */
export const PROVIDER_MODELS: Record<string, string> = {
  gemini: "gemini-flash-latest",
  groq: "llama-3.3-70b-versatile",
  openai: "gpt-4o-mini",
} as const;

// ---------------------------------------------------------------------------
// Game State Configuration
// ---------------------------------------------------------------------------

export const GAME_STATE_CONFIG = {
  MAX_EVENT_HISTORY_CHARS: 4000,
  EVENT_HISTORY_MARKER: "Event history",
  MAP_HEADER: "*** Description of the Map in the CURRENT Round: ***",
  ADVISOR_TAIL_START: "Remember, it is crucially important that you guide the player",
} as const;

// ---------------------------------------------------------------------------
// Ledger Configuration
// ---------------------------------------------------------------------------

export const LEDGER_CONFIG = {
  MAX_COMPLETE_STEPS_PER_OP: 5,
} as const;

// ---------------------------------------------------------------------------
// Browser Configuration
// ---------------------------------------------------------------------------

export const BROWSER_CONFIG = {
  SCREEN_WIDTH: 1512,
  SCREEN_HEIGHT: 982,
  PAGE_ZOOM_X: 0.87,
  PAGE_ZOOM_Y: 0.87,
  ACTION_DELAY_MS: 2000,
  POPUP_POLL_MS: 3000,
} as const;

// ---------------------------------------------------------------------------
// File Paths
// ---------------------------------------------------------------------------

export const PATHS = {
  WAR_ROOM: "war-room",
  AUTH_DIR: "auth",
  AUTH_STATE: "auth_state.json",
  CURRENT_STATE: "current_state.json",
  ADVISOR_RESPONSE: "advisor_response.txt",
  CAMPAIGNS_DIR: "campaigns",
  SESSIONS_DIR: "sessions",
  ACTIVE_CAMPAIGN: "active-campaign.txt",
  STRATEGIC_LEDGER: "strategic_ledger.json",
  OWNERSHIP_SNAPSHOT: "ownership_snapshot.json",
  NEXT_ADVISOR_QUERY: "next_advisor_query.txt",
  CONSTITUTION: "constitution.md",
  CRISIS_HANDBOOK: "crisis_handbook.txt",
} as const;
