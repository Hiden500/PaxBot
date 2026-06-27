/**
 * Unit tests for Spy: state-writer.ts
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import * as fs from "fs";
import * as path from "path";

// Mock ownership-parser to avoid side effects in tests
vi.mock("./ownership-parser", () => ({
  parseOwnershipFromStateText: vi.fn(() => null),
  writeOwnershipSnapshot: vi.fn(),
}));

// Re-import after mocking
import { writeGameStateFromPayload, writeAdvisorResponse } from "./state-writer";
import { getSessionDir } from "../shared/session";
import { PATHS } from "../shared/config";

const sessionDir = getSessionDir();
const WAR_ROOM = path.join(process.cwd(), "war-room");
const STATE_PATH = path.join(sessionDir, PATHS.CURRENT_STATE);
const ADVISOR_PATH = path.join(sessionDir, PATHS.ADVISOR_RESPONSE);

const RULES_PATH = path.join(sessionDir, "world_rules.txt");

function cleanFiles() {
  [STATE_PATH, ADVISOR_PATH, RULES_PATH].forEach((p) => {
    if (fs.existsSync(p)) {
      fs.unlinkSync(p);
    }
  });
}

// ---------------------------------------------------------------------------
// writeGameStateFromPayload
// ---------------------------------------------------------------------------

describe("writeGameStateFromPayload", () => {
  beforeEach(() => cleanFiles());
  afterEach(() => cleanFiles());

  it("writes current_state from valid JSON payload with prompt", () => {
    const payload = JSON.stringify({ prompt: "Game state data here" });
    writeGameStateFromPayload(payload);

    expect(fs.existsSync(STATE_PATH)).toBe(true);
    const content = JSON.parse(fs.readFileSync(STATE_PATH, "utf-8"));
    expect(content.current_state).toBe("Game state data here");
  });

  it("strips advisor-only content before MAP_HEADER and caches rules", () => {
    const payload = JSON.stringify({
      prompt:
        "Advisor system prompt here...\n[Context for This Game]\nSome world rules\nDescription of the Map in the CURRENT Round:\nActual game state content",
    });
    writeGameStateFromPayload(payload);

    const content = JSON.parse(fs.readFileSync(STATE_PATH, "utf-8"));
    expect(content.current_state).not.toContain("Advisor system prompt");
    expect(content.current_state).not.toContain("Some world rules");
    expect(content.current_state).toContain("Actual game state content");
    expect(fs.existsSync(path.join(sessionDir, "world_rules.txt"))).toBe(true);
    const rules = fs.readFileSync(path.join(sessionDir, "world_rules.txt"), "utf-8");
    expect(rules).toContain("Some world rules");
  });

  it("extracts recent diplomacy", () => {
    const payload = JSON.stringify({
      prompt:
        "Description of the Map in the CURRENT Round:\nMap stuff\n[Event History]\nEvents\n[Recent Diplomacy]\nDiplomacy stuff",
    });
    writeGameStateFromPayload(payload);

    const content = JSON.parse(fs.readFileSync(STATE_PATH, "utf-8"));
    expect(content.current_state).toContain("Map stuff");
    expect(content.current_state).toContain("Events");
    expect(content.current_state).toContain("Diplomacy stuff");
  });

  it("writes null current_state when payload is null", () => {
    writeGameStateFromPayload(null);

    const content = JSON.parse(fs.readFileSync(STATE_PATH, "utf-8"));
    expect(content.current_state).toBeNull();
  });

  it("writes null current_state when payload is empty string", () => {
    writeGameStateFromPayload("");

    const content = JSON.parse(fs.readFileSync(STATE_PATH, "utf-8"));
    expect(content.current_state).toBeNull();
  });

  it("writes null current_state when payload is not valid JSON", () => {
    writeGameStateFromPayload("not json at all");

    const content = JSON.parse(fs.readFileSync(STATE_PATH, "utf-8"));
    expect(content.current_state).toBeNull();
  });

  it("writes null current_state when prompt field is missing", () => {
    const payload = JSON.stringify({ otherField: "no prompt here" });
    writeGameStateFromPayload(payload);

    const content = JSON.parse(fs.readFileSync(STATE_PATH, "utf-8"));
    expect(content.current_state).toBeNull();
  });

  it("writes null current_state when prompt is not a string", () => {
    const payload = JSON.stringify({ prompt: 12345 });
    writeGameStateFromPayload(payload);

    const content = JSON.parse(fs.readFileSync(STATE_PATH, "utf-8"));
    expect(content.current_state).toBeNull();
  });

  it("creates war-room directory if it does not exist", () => {
    // Remove the directory temporarily
    if (fs.existsSync(WAR_ROOM)) {
      // Move state file aside to test directory creation
      const tempState = path.join(process.cwd(), "temp_state_backup.json");
      if (fs.existsSync(STATE_PATH)) {
        fs.renameSync(STATE_PATH, tempState);
      }

      writeGameStateFromPayload(JSON.stringify({ prompt: "test" }));

      expect(fs.existsSync(WAR_ROOM)).toBe(true);
      expect(fs.existsSync(STATE_PATH)).toBe(true);

      // Clean up temp
      if (fs.existsSync(tempState)) {
        fs.renameSync(tempState, STATE_PATH);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// writeAdvisorResponse
// ---------------------------------------------------------------------------

describe("writeAdvisorResponse", () => {
  beforeEach(() => cleanFiles());
  afterEach(() => cleanFiles());

  it("writes advisor response to file", () => {
    writeAdvisorResponse("Consider invading Japan next turn.");

    expect(fs.existsSync(ADVISOR_PATH)).toBe(true);
    const content = fs.readFileSync(ADVISOR_PATH, "utf-8");
    expect(content).toBe("Consider invading Japan next turn.");
  });

  it("writes empty string when text is null", () => {
    writeAdvisorResponse(null);

    const content = fs.readFileSync(ADVISOR_PATH, "utf-8");
    expect(content).toBe("");
  });

  it("overwrites existing advisor response", () => {
    writeAdvisorResponse("First response");
    writeAdvisorResponse("Updated response");

    const content = fs.readFileSync(ADVISOR_PATH, "utf-8");
    expect(content).toBe("Updated response");
  });

  it("writes empty string when text is empty string", () => {
    writeAdvisorResponse("");

    const content = fs.readFileSync(ADVISOR_PATH, "utf-8");
    expect(content).toBe("");
  });
});
