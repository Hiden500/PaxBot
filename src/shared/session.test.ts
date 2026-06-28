import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import * as fs from "fs";
import * as path from "path";
import {
  slugify,
  getActiveCampaignName,
  setActiveCampaignName,
  getSessionDir,
  getCampaignUrl,
  setCampaignUrl,
} from "./session";

const tempCwd = path.join(__dirname, "../../test-results/temp-session-test");

describe("shared/session", () => {
  beforeEach(() => {
    vi.spyOn(process, "cwd").mockReturnValue(tempCwd);
    if (!fs.existsSync(tempCwd)) {
      fs.mkdirSync(tempCwd, { recursive: true });
    }
    fs.mkdirSync(path.join(tempCwd, "war-room/sessions"), { recursive: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (fs.existsSync(tempCwd)) {
      fs.rmSync(tempCwd, { recursive: true, force: true });
    }
  });

  it("transliterates cyrillic and slugifies names correctly", () => {
    expect(slugify("Россия 2050: Евразийский Бастион")).toBe("rossiya-2050-evraziyskiy-bastion");
    expect(slugify("Test Campaign @ 123")).toBe("test-campaign-123");
    expect(slugify("Capital-Letter-Slug")).toBe("capital-letter-slug");
  });

  it("returns 'default' when active-campaign file does not exist", () => {
    expect(getActiveCampaignName()).toBe("default");
  });

  it("writes and reads active campaign name correctly", () => {
    setActiveCampaignName("Моя Кампания 2050");
    expect(getActiveCampaignName()).toBe("Моя Кампания 2050");
  });

  it("creates session directory structure and returns correct path", () => {
    setActiveCampaignName("Тестовая Партия");
    const sessionDir = getSessionDir();
    const expectedDir = path.join(tempCwd, "war-room", "sessions", "testovaya-partiya");
    expect(sessionDir).toBe(expectedDir);
    expect(fs.existsSync(sessionDir)).toBe(true);
  });

  it("writes and reads campaign URL correctly", () => {
    setActiveCampaignName("Тестовая Партия");
    expect(getCampaignUrl()).toBe("");
    setCampaignUrl("https://www.paxhistoria.co/game/12345");
    expect(getCampaignUrl()).toBe("https://www.paxhistoria.co/game/12345");
  });
});
