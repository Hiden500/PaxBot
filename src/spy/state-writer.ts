/**
 * Spy: write captured game-state payload to war-room/current_state.json.
 * PRD: "Parse this JSON and write the relevant state information to current_state.json."
 *
 * We persist the stripped game state under the key "current_state" (not "prompt")
 * so the Brain/LLM sees only game state: map, USA status, event history, diplomacy.
 * Other keys (gameID, round, etc.) are not written.
 */

import * as fs from "fs";
import * as path from "path";

const WAR_ROOM_PATH = path.join(process.cwd(), "war-room", "current_state.json");

const MAP_HEADER = "*** Description of the Map in the CURRENT Round: ***";
const ADVISOR_TAIL_START = "Remember, it is crucially important that you guide the player";

/**
 * Keeps only the middle game-state content for the Brain; drops advisor system
 * prompt (top) and "respond to the user" / chat instructions (bottom).
 */
function stripAdvisorOnlyContent(prompt: string): string {
  let s = prompt;
  const mapIdx = s.indexOf(MAP_HEADER);
  if (mapIdx !== -1) {
    s = s.slice(mapIdx);
  }
  const tailIdx = s.indexOf(ADVISOR_TAIL_START);
  if (tailIdx !== -1) {
    s = s.slice(0, tailIdx).trimEnd();
  }
  return s;
}

/**
 * Parses the request body (JSON), extracts the "prompt" field, strips advisor-only
 * top/bottom content, and writes { "current_state": "<string>" } to war-room/current_state.json.
 */
export function writeGameStateFromPayload(body: string | null): void {
  const out: { current_state: string | null } = { current_state: null };
  if (body == null || body === "") {
    fs.mkdirSync(path.dirname(WAR_ROOM_PATH), { recursive: true });
    fs.writeFileSync(WAR_ROOM_PATH, JSON.stringify(out, null, 2), "utf-8");
    console.log("[Spy] Wrote game state (no payload) to war-room/current_state.json");
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
  fs.mkdirSync(path.dirname(WAR_ROOM_PATH), { recursive: true });
  fs.writeFileSync(WAR_ROOM_PATH, JSON.stringify(out, null, 2), "utf-8");
  console.log("[Spy] Wrote game state (current_state, advisor instructions stripped) to war-room/current_state.json");
}

const ADVISOR_RESPONSE_PATH = path.join(process.cwd(), "war-room", "advisor_response.txt");

/**
 * Writes the latest advisor reply to war-room/advisor_response.txt.
 * Overwritten each turn when we get a new response. Brain reads this in Phase 3.
 */
export function writeAdvisorResponse(text: string | null): void {
  fs.mkdirSync(path.dirname(ADVISOR_RESPONSE_PATH), { recursive: true });
  fs.writeFileSync(ADVISOR_RESPONSE_PATH, text ?? "", "utf-8");
  console.log("[Spy] Wrote advisor response to war-room/advisor_response.txt");
}
