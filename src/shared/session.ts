import * as fs from "fs";
import * as path from "path";
import { PATHS } from "./config";

const CYRILLIC_MAP: Record<string, string> = {
  а: "a",
  б: "b",
  в: "v",
  г: "g",
  д: "d",
  е: "e",
  ё: "yo",
  ж: "zh",
  з: "z",
  и: "i",
  й: "y",
  к: "k",
  л: "l",
  м: "m",
  н: "n",
  о: "o",
  п: "p",
  р: "r",
  с: "s",
  т: "t",
  у: "u",
  ф: "f",
  х: "kh",
  ц: "ts",
  ч: "ch",
  ш: "sh",
  щ: "shch",
  ъ: "",
  ы: "y",
  ь: "",
  э: "e",
  ю: "yu",
  я: "ya",
};

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .split("")
    .map((char) => CYRILLIC_MAP[char] || char)
    .join("")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

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
  const sessionDir = path.join(
    process.cwd(),
    PATHS.WAR_ROOM,
    PATHS.SESSIONS_DIR,
    slugify(campaign)
  );

  if (!fs.existsSync(sessionDir)) {
    fs.mkdirSync(sessionDir, { recursive: true });
  }

  return sessionDir;
}
