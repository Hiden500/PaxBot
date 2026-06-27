/**
 * Spy: parse "All Regions Owned" from game state blob
 * to produce an explicit ownership snapshot for the War Room.
 *
 * Avoids Brain confusion (e.g. "Philippines" is ours; only regions in
 * regions_we_own are ours; troops can be stationed in regions we own).
 */

import * as fs from "fs";
import * as path from "path";
import { OwnershipSnapshotSchema, type OwnershipSnapshot } from "../shared";
import { PATHS } from "../shared/config";
import { getSessionDir } from "../shared/session";

/** Match "roleplaying as the polity of X." */
const NATION_RE = /roleplaying as the polity of (.*?)\./i;

/**
 * Parse the player nation and list of regions we own from the state blob.
 */
export function parseOwnershipFromStateText(stateText: string): OwnershipSnapshot | null {
  const nationMatch = stateText.match(NATION_RE);
  if (!nationMatch) {
    console.warn("[Spy] Could not extract player nation from prompt");
    return null;
  }

  const ourNation = nationMatch[1].trim();

  // Find the nation's block in the map:
  // "Nation Name":
  // All Owned Regions:
  // "Region1", "Region2"
  // All Battalions:
  const blockRe = new RegExp(
    `"${ourNation}":\\s*All Owned Regions:\\s*([\\s\\S]*?)\\nAll Battalions:`,
    "i"
  );
  const blockMatch = stateText.match(blockRe);

  if (!blockMatch) {
    console.warn(`[Spy] Could not find regions block for nation: ${ourNation}`);
    return null;
  }

  const rawList = blockMatch[1];

  // Comma-separated; may have newlines and optional quotes
  const regions = rawList
    .split(",")
    .map((s) => s.replace(/^["'\s]+|["'\s]+$/g, "")) // trim quotes and whitespace
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
  const sessionDir = getSessionDir();
  const ownershipPath = path.join(sessionDir, PATHS.OWNERSHIP_SNAPSHOT);

  const dir = path.dirname(ownershipPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(ownershipPath, JSON.stringify(snapshot, null, 2), "utf-8");
  console.log(
    `[Spy] Wrote ownership snapshot: ${snapshot.our_nation}, ${snapshot.regions_we_own.length} regions we own → ${ownershipPath}`
  );
}
