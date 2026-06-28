import { describe, it, expect } from "vitest";
import {
  LLM_CONFIG,
  DEFAULT_LLM_PROVIDER,
  PROVIDER_MODELS,
  GAME_STATE_CONFIG,
  BROWSER_CONFIG,
  PATHS,
} from "./config";

describe("shared/config", () => {
  it("should have correct LLM configuration", () => {
    expect(LLM_CONFIG).toBeDefined();
    expect(LLM_CONFIG.MODEL).toBe("gemini-2.5-flash");
    expect(typeof LLM_CONFIG.MAX_OUTPUT_TOKENS).toBe("number");
    expect(LLM_CONFIG.RETRY_MAX_ATTEMPTS).toBeGreaterThan(0);
  });

  it("should have correct default LLM provider", () => {
    expect(DEFAULT_LLM_PROVIDER).toBe("gemini");
  });

  it("should define supported provider models", () => {
    expect(PROVIDER_MODELS).toBeDefined();
    expect(PROVIDER_MODELS.gemini).toBeDefined();
    expect(PROVIDER_MODELS.groq).toBeDefined();
    expect(PROVIDER_MODELS.openai).toBeDefined();
  });

  it("should have correct game state configuration markers", () => {
    expect(GAME_STATE_CONFIG).toBeDefined();
    expect(GAME_STATE_CONFIG.MAP_HEADER).toBe("Description of the Map in the CURRENT Round:");
    expect(GAME_STATE_CONFIG.CONTEXT_MARKER).toBe("[Context for This Game]");
  });

  it("should define browser dimensions and zoom", () => {
    expect(BROWSER_CONFIG).toBeDefined();
    expect(BROWSER_CONFIG.SCREEN_WIDTH).toBeGreaterThan(0);
    expect(BROWSER_CONFIG.SCREEN_HEIGHT).toBeGreaterThan(0);
    expect(BROWSER_CONFIG.PAGE_ZOOM_X).toBeCloseTo(0.87);
  });

  it("should define required paths", () => {
    expect(PATHS).toBeDefined();
    expect(PATHS.WAR_ROOM).toBe("war-room");
    expect(PATHS.AUTH_DIR).toBe("auth");
    expect(PATHS.CURRENT_STATE).toBe("current_state.json");
  });
});
