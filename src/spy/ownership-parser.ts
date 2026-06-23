/**
 * Spy: parse "Status of X" and "All Regions Owned" from game state blob
 * to produce an explicit ownership snapshot for the War Room.
 *
 * Avoids Brain confusion (e.g. "Philippines" is ours; only regions in
 * regions_we_own are ours; troops can be stationed in regions we own).
 */

import * as fs from "fs";
import * as path from "path";
import { OwnershipSnapshotSchema, type OwnershipSnapshot } from "../shared";

const OWNERSHIP_PATH = path.join(process.cwd(), "war-room", "ownership_snapshot.json");

/** Match **Status of USA:** or **Status of Republic Of China:** */
const STATUS_RE = /\*\*Status of ([^*]+):\*\*/i;
/** After "All Regions Owned" we capture until the next "- " section (e.g. "- Military Units:") */
const ALL_REGIONS_OWNED_MARKER = "- All Regions Owned:";
const NEXT_SECTION_RE = /\n\s*-\s+[A-Za-z]/;

/**
 * Parse the player nation and list of regions we own from the state blob.
 * Uses the "**Status of X:**" / "- All Regions Owned:" block (authoritative for our nation).
 */
export function parseOwnershipFromStateText(stateText: string): OwnershipSnapshot | null {
  const statusMatch = stateText.match(STATUS_RE);
  if (!statusMatch) {
    return null;
  }

  const ourNation = statusMatch[1].trim();
  const afterStatus = stateText.slice(statusMatch.index! + statusMatch[0].length);
  const ownedIdx = afterStatus.indexOf(ALL_REGIONS_OWNED_MARKER);
  if (ownedIdx === -1) {
    return null;
  }

  const listStart = ownedIdx + ALL_REGIONS_OWNED_MARKER.length;
  let listEnd = afterStatus.length;
  const nextSection = afterStatus.slice(listStart).match(NEXT_SECTION_RE);
  if (nextSection && typeof nextSection.index === "number") {
    listEnd = listStart + nextSection.index;
  }
  const rawList = afterStatus.slice(listStart, listEnd);

  // Comma-separated; may have newlines and optional quotes
  const regions = rawList
    .split(",")
    .map((s) => s.replace(/^["']|["']$/g, "").trim())
    .map((s) => s.replace(/^["']|["']$/g, "").trim())
    .filter(Boolean);

  return OwnershipSnapshotSchema.parse({
    our_nation: ourNation,
    regions_we_own: regions,
  });
}

/**
 * Write ownership snapshot to war-room/ownership_snapshot.json.
 * Call after writing current_state.json when we have a parsed snapshot.
 */
export function writeOwnershipSnapshot(snapshot: OwnershipSnapshot): void {
  const dir = path.dirname(OWNERSHIP_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(OWNERSHIP_PATH, JSON.stringify(snapshot, null, 2), "utf-8");
  console.log(
    `[Spy] Wrote ownership snapshot: ${snapshot.our_nation}, ${snapshot.regions_we_own.length} regions we own → war-room/ownership_snapshot.json`
  );
}
