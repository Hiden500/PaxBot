/**
 * Spy: write captured game-state payload to war-room/current_state.json.
 * PRD: "Parse this JSON and write the relevant state information to current_state.json."
 *
 * We persist the stripped game state under the key "current_state" (not "prompt")
 * so the Brain/LLM sees only game state: map, USA status, event history, diplomacy.
 * Other keys (gameID, round, etc.) are not written.
 *
 * We also parse "Status of X" / "All Regions Owned" and write ownership_snapshot.json
 * so the Brain has an explicit reference: what we own vs what we do not.
 */

import * as fs from "fs";
import * as path from "path";
import { parseOwnershipFromStateText, writeOwnershipSnapshot } from "./ownership-parser";
import { GAME_STATE_CONFIG, PATHS } from "../shared/config";
import { getSessionDir } from "../shared/session";

/**
 * Smart parses the game state prompt.
 * 1. Extracts World Rules and caches them to world_rules.txt
 * 2. Keeps Map, Event History (trimmed), and Recent Diplomacy
 */
function smartParseGameState(prompt: string): string {
  // 1. Cache World Rules (Context, Mechanics, Language, Game Details)
  const contextIdx = prompt.indexOf(GAME_STATE_CONFIG.CONTEXT_MARKER);
  const mapIdx = prompt.indexOf(GAME_STATE_CONFIG.MAP_HEADER);

  if (contextIdx !== -1 && mapIdx !== -1 && contextIdx < mapIdx) {
    const worldRules = prompt.slice(contextIdx, mapIdx).trim();
    const sessionDir = getSessionDir();
    const rulesPath = path.join(sessionDir, "world_rules.txt");
    if (!fs.existsSync(rulesPath)) {
      fs.mkdirSync(path.dirname(rulesPath), { recursive: true });
      fs.writeFileSync(rulesPath, worldRules, "utf-8");
      console.log(`[Spy] Cached World Rules to ${rulesPath}`);
    }
  }

  // 2. Build filtered state
  let filtered = "";

  // Extract Map to Other Guidelines / Event History
  const eventIdx = prompt.indexOf(GAME_STATE_CONFIG.EVENT_HISTORY_MARKER);
  if (mapIdx !== -1) {
    if (eventIdx !== -1 && eventIdx > mapIdx) {
      filtered += prompt.slice(mapIdx, eventIdx).trim() + "\n\n";
    } else {
      filtered += prompt.slice(mapIdx).trim() + "\n\n";
    }
  }

  // Extract Event History (trimmed)
  if (eventIdx !== -1) {
    const diplomacyIdx = prompt.indexOf(GAME_STATE_CONFIG.RECENT_DIPLOMACY_MARKER);
    let eventHistory = "";
    if (diplomacyIdx !== -1 && diplomacyIdx > eventIdx) {
      eventHistory = prompt.slice(eventIdx, diplomacyIdx).trim();
    } else {
      eventHistory = prompt.slice(eventIdx).trim();
    }

    if (eventHistory.length > GAME_STATE_CONFIG.MAX_EVENT_HISTORY_CHARS) {
      // Keep last MAX chars only
      const trimmed =
        "… [truncated] " + eventHistory.slice(-GAME_STATE_CONFIG.MAX_EVENT_HISTORY_CHARS);
      filtered += trimmed + "\n\n";
    } else {
      filtered += eventHistory + "\n\n";
    }
  }

  // Extract Diplomacy
  const diplomacyIdx = prompt.indexOf(GAME_STATE_CONFIG.RECENT_DIPLOMACY_MARKER);
  if (diplomacyIdx !== -1) {
    filtered += prompt.slice(diplomacyIdx).trim();
  }

  return filtered || prompt; // fallback to full prompt if parsing fails completely
}

/**
 * Parses the request body (JSON), extracts the "prompt" field, strips advisor-only
 * top/bottom content, and writes { "current_state": "<string>" } to war-room/current_state.json.
 */
export function writeGameStateFromPayload(body: string | null): void {
  const sessionDir = getSessionDir();
  const warRoomPath = path.join(sessionDir, PATHS.CURRENT_STATE);
  const out: { current_state: string | null } = { current_state: null };

  if (body === null || body === "") {
    fs.mkdirSync(path.dirname(warRoomPath), { recursive: true });
    fs.writeFileSync(warRoomPath, JSON.stringify(out, null, 2), "utf-8");
    console.log(`[Spy] Wrote game state (no payload) to ${warRoomPath}`);
    return;
  }

  let rawPrompt = "";
  try {
    const data = JSON.parse(body) as Record<string, unknown>;
    if (typeof data.prompt === "string") {
      rawPrompt = data.prompt;
      out.current_state = smartParseGameState(rawPrompt);
    }
  } catch {
    // not JSON; leave current_state null
  }

  fs.mkdirSync(path.dirname(warRoomPath), { recursive: true });
  fs.writeFileSync(warRoomPath, JSON.stringify(out, null, 2), "utf-8");
  console.log(
    `[Spy] Wrote game state (current_state, advisor instructions stripped) to ${warRoomPath}`
  );

  // Explicit ownership snapshot so Brain knows what we own vs what we do not
  // Pass the raw prompt because player nation is stated at the very top
  if (rawPrompt) {
    const ownership = parseOwnershipFromStateText(rawPrompt);
    if (ownership) {
      writeOwnershipSnapshot(ownership);
    }
  }
}

/**
 * Writes the latest advisor reply to war-room/advisor_response.txt.
 * Overwritten each turn when we get a new response. Brain reads this in Phase 3.
 */
export function writeAdvisorResponse(text: string | null): void {
  const sessionDir = getSessionDir();
  const advisorPath = path.join(sessionDir, PATHS.ADVISOR_RESPONSE);

  fs.mkdirSync(path.dirname(advisorPath), { recursive: true });
  fs.writeFileSync(advisorPath, text ?? "", "utf-8");
  console.log(`[Spy] Wrote advisor response to ${advisorPath}`);
}
