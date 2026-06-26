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

const NEXT_MARKER_RE = /(?=\*\*\* Description of the Map)/;

/**
 * Keeps only the middle game-state content for the Brain; drops advisor system
 * prompt (top) and "respond to the user" / chat instructions (bottom).
 * Also trims stale event history beyond MAX_EVENT_HISTORY_CHARS.
 */
function stripAdvisorOnlyContent(prompt: string): string {
  let s = prompt;
  const mapIdx = s.indexOf(GAME_STATE_CONFIG.MAP_HEADER);
  if (mapIdx !== -1) {
    s = s.slice(mapIdx);
  }
  const tailIdx = s.indexOf(GAME_STATE_CONFIG.ADVISOR_TAIL_START);
  if (tailIdx !== -1) {
    s = s.slice(0, tailIdx).trimEnd();
  }
  // Trim stale event history
  const eventIdx = s.indexOf(GAME_STATE_CONFIG.EVENT_HISTORY_MARKER);
  if (eventIdx !== -1) {
    const nextSection = s
      .slice(eventIdx + GAME_STATE_CONFIG.EVENT_HISTORY_MARKER.length)
      .match(NEXT_MARKER_RE);
    const historyEnd =
      nextSection && typeof nextSection.index === "number"
        ? eventIdx + GAME_STATE_CONFIG.EVENT_HISTORY_MARKER.length + nextSection.index
        : s.length;
    const eventHistory = s.slice(eventIdx, historyEnd);
    if (eventHistory.length > GAME_STATE_CONFIG.MAX_EVENT_HISTORY_CHARS) {
      // Keep last MAX chars only
      const trimmed =
        "… [truncated] " + eventHistory.slice(-GAME_STATE_CONFIG.MAX_EVENT_HISTORY_CHARS);
      s = s.slice(0, eventIdx) + trimmed + s.slice(historyEnd);
    }
  }
  return s;
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
  try {
    const data = JSON.parse(body) as Record<string, unknown>;
    if (typeof data.prompt === "string") {
      out.current_state = stripAdvisorOnlyContent(data.prompt);
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
  if (out.current_state) {
    const ownership = parseOwnershipFromStateText(out.current_state);
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
