import * as fs from "fs";
import * as path from "path";
import { PATHS } from "./config";

/**
 * Get the name of the active campaign.
 * Defaults to "default" if no active campaign is set.
 */
export function getActiveCampaignName(): string {
  const activePath = path.join(process.cwd(), PATHS.WAR_ROOM, PATHS.ACTIVE_CAMPAIGN);
  if (fs.existsSync(activePath)) {
    const content = fs.readFileSync(activePath, "utf-8").trim();
    if (content) {
      return content;
    }
  }
  return "default";
}

/**
 * Set the active campaign name.
 */
export function setActiveCampaignName(name: string): void {
  const activePath = path.join(process.cwd(), PATHS.WAR_ROOM, PATHS.ACTIVE_CAMPAIGN);
  fs.writeFileSync(activePath, name, "utf-8");
}

/**
 * Get the session directory for the active campaign.
 * Ensures the directory exists.
 */
export function getSessionDir(): string {
  const campaign = getActiveCampaignName();
  const sessionDir = path.join(process.cwd(), PATHS.WAR_ROOM, PATHS.SESSIONS_DIR, campaign);

  if (!fs.existsSync(sessionDir)) {
    fs.mkdirSync(sessionDir, { recursive: true });
  }

  return sessionDir;
}
